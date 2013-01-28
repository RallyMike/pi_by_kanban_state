// return all leaf stories of a hard-coded PI object ID


Ext.define('CustomApp', {
    extend:'Rally.app.App',
    componentCls:'app',
    layout:{
        type:'vbox',
        align:'stretch'
    },
    items:[

        { // define a container to house header info about the PI
            xtype:'container',
            itemId:'piHeaderContainer',
            padding:'15 15 15 15' // top ? bottom left,
        },
        {
            // panel where we will place the grid for the PI's leaf stories
            xtype:'panel',
            itemId:'piLeafStoryGridContainer',
            layout:'fit'
        }
    ],


    // --- App global variables ---

    // --- end global variables ---


    fireChooser:function () {

        // Chooser to select PI to retrieve the leaf stories for

        Ext.create('Rally.ui.dialog.ChooserDialog', {
            artifactTypes:['PortfolioItem'],
            autoShow:true,
            title:'Select Portfolio Item',
            limit:20,
            height:500,
            listeners:{
                artifactChosen:function (selectedRecord) {
                    this._getLeafStoriesInPi(selectedRecord);
                },
                scope:this
            }
        });
    },

    launch:function () {

        // main function

        // add "select PI" button to header
        var piHeaderContainer = this.down('#piHeaderContainer');
        piHeaderContainer.add({
            xtype:'rallybutton',
            text:'Select Portfolio Item',
            listeners:{
                click:this.fireChooser,
                scope:this
            }
        });


        // add PI name text box (nulled) to header
        var piTextBox = Ext.create('Ext.container.Container', {
            itemId:"piTextBox",
            html:""
        });
        piHeaderContainer.add(piTextBox);

    }, // end launch


    // reset the page's controls
    _reset:function () {
        this.down('#piLeafStoryGridContainer').removeAll();
    },


    // after PI selected, query for all its leaf level stories
    _getLeafStoriesInPi:function (selectedRecord) {

        var piFormattedID = selectedRecord.get('FormattedID');
        var piObjectID = selectedRecord.get('ObjectID');
        var piName = selectedRecord.get("Name");

        this._reset();


        var piTextBox = this.down('#piTextBox');
        //piHeaderContainer.removeAll(true);

        piTextBox.update('<font size="5"><br><b>Portfolio Item: </b>' + piFormattedID + " - " + piName + "</font>");


        var query = {
            "__At":"current",
            "_TypeHierarchy":"HierarchicalRequirement",
            "Children":null,
            "_ItemHierarchy":piObjectID
        };

        // set query config info
        var find = ["ObjectID", "_UnformattedID", "Name", "Release", "ScheduleState", "PlanEstimate"];
        var queryString = Ext.JSON.encode(query);

        // set context to global across the workspace
        var context = this.getContext().getDataContext();
        context.project = undefined;

        // fetch the snapshot of all leaf level stories for the PI
        var ssPiLeafStories = Ext.create('Rally.data.lookback.SnapshotStore', {
            context:{
                workspace:this.context.getWorkspace(),
                project:this.context.getProject()
            },
            pageSize:10000000,
            fetch:find,
            rawFind:query,
            hydrate:["ScheduleState"],
            autoLoad:true,
            listeners:{
                scope:this,
                load:this._processPiLeafStories
            }
        });


    }, // end _getStoriesInPi

    // bucket the PI's leaf stories
    _processPiLeafStories:function (store, records) {

        // spit out all leaf stories into a grid
        var snapshotGrid = Ext.create('Rally.ui.grid.Grid', {
            title:'Snapshots',
            store:store,
            columnCfgs:[
                {
                    text:'ObjectID',
                    dataIndex:'ObjectID'
                },
                {
                    text:'Name',
                    dataIndex:'Name'
                },
                {
                    text:'Project',
                    dataIndex:'Project'
                },
                {
                    text:'_UnformattedID',
                    dataIndex:'_UnformattedID'
                },
                ,
                {
                    text:'Release',
                    dataIndex:'Release'
                },
                {
                    text:'PlanEstimate',
                    dataIndex:'PlanEstimate'
                },
                {
                    text:'ScheduleState',
                    dataIndex:'ScheduleState'
                }
            ]//,
            //height:400
        });

        // render the grid of all of the PI's leaf stories
        var gridHolder = this.down('#piLeafStoryGridContainer');
        gridHolder.removeAll(true);
        gridHolder.add(snapshotGrid);

    } // end _processPiLeafStories

});
