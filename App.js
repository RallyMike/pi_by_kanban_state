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
            // panel where we will place the grid for the PI's leaf stories by "kanban" state
            xtype:'panel',
            itemId:'piByStateGridContainer',
            layout:'fit'
        },
        {
            // panel where we will place the grid for the PI's leaf stories
            xtype:'panel',
            itemId:'piLeafStoryGridContainer',
            layout:'fit'
        }
    ],


    // --- App global variables ---

    //gKanbanStateFieldName: "MikeBan",
    gKanbanStateFieldName: "KanbanState",

    gStateMetaDataArray: [], // array to hold the PI's leaf story meta data per state

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
                    this._getPiInfo(selectedRecord);
                },
                scope:this
            }
        });
    },

    launch:function () {

        // main function

        // MODEL - we need to determine the order of states via the WSAPI model
        this._getStoryModel();

    }, // end launch


    // reset the page's controls
    _reset:function () {

        // reset all containers
        this.down('#piLeafStoryGridContainer').removeAll();
        this.down('#piByStateGridContainer').removeAll();

        this._resetStateMetaDataArray();

    }, // end _reset


    // reset state meta data array
    _resetStateMetaDataArray:function () {

        // reset the global array of state meta data
        var len = this.gStateMetaDataArray.length
        for (var x = 0; x < len; x++){
            var aState = this.gStateMetaDataArray[x];
            aState.itsStoryCount = 0;
            aState.itsStoryPlanEstimate = 0;
            aState.itsAggregateStoryCount = 0;
            aState.itsAggregateStoryPlanEstimate = 0;
        }

    }, // end _resetStateMetaDataArray


    // retrieve the story model from WSAPI so we can determine what STATES are allowed
    _getStoryModel:function (){

        console.log("Enter _getStoryModel");

        // capture scope and WS context
        var appScope = this;
        var wsContext = this.context.getWorkspace();

        // LEARNING POINT: I HAD to use 'UserStory' as the type as 'Story' failed
        Rally.data.ModelFactory.getModel({
            type: 'UserStory',
            context: {

                // LEARNING POINT: why did I have to capture this before the model and use the _ref attribute
                workspace: wsContext._ref

            },
            success: function(model) {
                appScope._populateStates(model);
            },
            failure: function(f,a){
                Ext.Msg.alert("getModel() failed");
            }
        });

        console.log("Exit _getStoryModel");
    },


    // ----------------------------------------------------
    // populate the global STATE array with all of the allowed values
    // ----------------------------------------------------
    _populateStates:function (theStoryModel){

//        console.log("Enter _populateStates");

        //console.log("theStoryModel");
        //console.log(theStoryModel);

        //var stateField = theStoryModel.getField(this.gKanbanStateFieldName);
        var stateField = theStoryModel.getField('KanbanState');

//        console.log("stateField");
//        console.log(stateField);
//        console.log("-----------------");

        nbrAllowedValues = stateField.allowedValues.length;
        console.log("nbrAllowedValues: " + nbrAllowedValues);

        // prepopulate states with each of the allowed values
        for (var ndx = 0; ndx < nbrAllowedValues; ndx++){

            // localize the allowed value
            aValue = stateField.allowedValues[ndx].StringValue;
            console.log("aValue: " + aValue);

            // populate initial entry for this state
            var storyStateMetaData = new Object();
            storyStateMetaData.itsName = aValue;
            storyStateMetaData.itsStoryCount = 0;
            storyStateMetaData.itsStoryPlanEstimate = 0;
            storyStateMetaData.itsAggregateStoryCount = 0;
            storyStateMetaData.itsAggregateStoryPlanEstimate = 0;

            // add it to the state array
            this.gStateMetaDataArray.push(storyStateMetaData);

        } // end loop through all allowed values


        // now add the form's controls to the page (PI name/dates/etc. and the select PI button)
        this._addFormControls();


        //console.log("Exit _populateStates");
    },


    // ----------------------------------------------------
    // add the initial controls to the form (PI fields, choose PI button, etc.)
    // ----------------------------------------------------
    _addFormControls:function (){

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

        // add PI actual start date text box (nulled) to header
        var piActualStartDateTextBox = Ext.create('Ext.container.Container', {
            itemId:"piActualStartDateTextBox",
            html:""
        });
        piHeaderContainer.add(piActualStartDateTextBox);

        // add PI planned end date text box (nulled) to header
        var piPlannedEndDateTextBox = Ext.create('Ext.container.Container', {
            itemId:"piPlannedEndDateTextBox",
            html:""
        });
        piHeaderContainer.add(piPlannedEndDateTextBox);

    },


    // ----------------------------------------------------
    // the PI chooser button has been fired...now its time to go get the selected PI's data
    // ----------------------------------------------------
    _getPiInfo:function (selectedRecord) {

        var piFormattedID = selectedRecord.get('FormattedID');
        var piObjectID = selectedRecord.get('ObjectID');
        var piName = selectedRecord.get("Name");

        this._reset();


        console.log("piObjectID: " + piObjectID);

        var store = Ext.create('Rally.data.WsapiDataStore', {
            model: 'PortfolioItem',
            fetch: ["ObjectID", "Name", "ActualStartDate", "PlannedEndDate"],
            // scope globally
            context: {
                project:null
            },
            filters: [
                {
                    property: 'ObjectID',
                    operator: '=',
                    value: piObjectID
                }
            ],
            limit: Infinity,
            autoLoad: true,
            listeners: {
                load:function (store, data, success) {

                    // map release OIDs to release NAMES
                    this._getLeafStoriesInPi(selectedRecord, store, data);

                },
                scope:this
            }
        });

    }, // end _getPiInfo


    // ----------------------------------------------------
    // after PI selected, query for all its leaf level stories
    // ----------------------------------------------------
    _getLeafStoriesInPi:function (selectedRecord, theStore, thePiRecords) {

        console.log("*** selectedRecord ***");
        console.log(selectedRecord);

        var piFormattedID = selectedRecord.get('FormattedID');
        var piObjectID = selectedRecord.get('ObjectID');
        var piName = selectedRecord.get("Name");


        // ----- BEGIN: grab the PI's date fields
        var nbrPiRecords;

        nbrPiRecords = thePiRecords.length;
        console.log("nbrPiRecords: " + nbrPiRecords);

        // we should only get a single record back for the PI we query for
        if (nbrPiRecords !== 1) {
            alert("Error: Multiple Portfolio Items Fetched for this Object ID");
            return;
        }

        var piActualStartDate = thePiRecords[0].get("ActualStartDate");
        var piPlannedEndDate = thePiRecords[0].get("PlannedEndDate");

        var piTextBox = this.down('#piTextBox');
        piTextBox.update('<font size="5"><br><b>Portfolio Item: </b>' + piFormattedID + " - " + piName + "</font>");

        var piActualStartDateTextBox = this.down('#piActualStartDateTextBox');
        piActualStartDateTextBox.update('<font size="4"><br><b>Actual Start Date: </b>' + piActualStartDate + "</font>");

        var piPlannedEndDateTextBox = this.down('#piPlannedEndDateTextBox');
        piPlannedEndDateTextBox.update('<font size="4"><br><b>Planned End Date: </b>' + piPlannedEndDate + "</font>");

        // ----- END: grab the PI's date fields


        // ----- BEGIN: query the LBAPI for all of the PI's leaf stories
        var query = {
            "__At":"current",
            "_TypeHierarchy":"HierarchicalRequirement",
            "Children":null,
            "_ItemHierarchy":piObjectID
        };

        // set query config info
        // MIKE - fetch KanbanState --- NOTE: using MikeBan for testing/debugging purposes
        var find = ["ObjectID", "_UnformattedID", "Name", "Release", "ScheduleState", "PlanEstimate", "c_" + this.gKanbanStateFieldName];
        var queryString = Ext.JSON.encode(query);

        // set context to global across the workspace
        var context = this.getContext().getDataContext();
        context.project = undefined;

        // fetch the snapshot of all leaf level stories for the PI
        var ssPiLeafStories = Ext.create('Rally.data.lookback.SnapshotStore', {
            context: {
                workspace: this.context.getWorkspace(),
                project: this.context.getProject()
            },
            pageSize: 10000000,
            fetch: find,
            rawFind: query,
            hydrate: ["ScheduleState", "c_" + this.gKanbanStateFieldName],
            autoLoad: true,
            listeners: {
                scope: this,
                load: this._processPiLeafStories
            }
        });

        // ----- END: query the LBAPI for all of the PI's leaf stories


    }, // end _getStoriesInPi


    // ----------------------------------------------------
    // output the PI's leaf stories in a grid and then call routine to bucket them by STATE
    // ----------------------------------------------------
    _processPiLeafStories:function (store, records) {

        // spit out all leaf stories into a grid
        var snapshotGrid = Ext.create('Rally.ui.grid.Grid', {
            title: 'Snapshots',
            store: store,
            columnCfgs: [
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
                },
                {
                    text:this.gKanbanStateFieldName,
                    dataIndex:'c_' + this.gKanbanStateFieldName
                }
            ]//,
            //height:400
        });

        // render the grid of all of the PI's leaf stories
        var gridHolder = this.down('#piLeafStoryGridContainer');
        gridHolder.removeAll(true);
        gridHolder.add(snapshotGrid);


        // time to start processing the PI's leaf stories by their "kanban" state
        this._processAllPiStoriesByState(records);

        //this._logStateMetaDataArray(this.gStateMetaDataArray);

        this._chartPiByState(this.gStateMetaDataArray);

    }, // end _processPiLeafStories


    // ----------------------------------------------------
    // process all PI's leaf stories by STATE
    // ----------------------------------------------------
    _processAllPiStoriesByState:function (theStoryRecords) {

        // clear any prior state meta data
        this._resetStateMetaDataArray();

        var nbrStories = theStoryRecords.length;

        // loop through each of the PI's stories
        for (var storyNdx = 0; storyNdx < nbrStories; storyNdx++) {

            var aStoryRecord = theStoryRecords[storyNdx];

            if (aStoryRecord !== null) {

                console.log("Story Name: " + aStoryRecord.get("Name"));

                // process this PI leaf story
                var rc = this._processPiStoryByState( this.gStateMetaDataArray, aStoryRecord);

                if (rc !== 0 ) {
                    console.log("*** Error updating the story state meta data array ***");
                    return rc;
                }

            } // end story record is not null

        } // end loop for all story records

    }, // end _processPiStoriesByState


    // chart out the PI's bucketed by kanban state
    _chartPiByState:function (theStoryStateMetaDataArray) {

        // define a custom  model
        var aModel = Ext.define('CustomStateModel', {
            extend: 'Ext.data.Model',
            fields: [
                {name:'itsName', type:'string'},
                {name:'itsStoryCount', type:'int'},
                {name:'itsStoryPlanEstimate', type:'int'},
                {name:'itsAggregateStoryCount', type:'int'},
                {name:'itsAggregateStoryPlanEstimate', type:'int'}            ]
        });


        // populate a store built around the custom model
        var aStore = Ext.create('Ext.data.Store', {
            storeId: 'piByStateStore',
            model: aModel,
            data: theStoryStateMetaDataArray
        });


        // define a rally grid to output the store's data in
        var aGrid = Ext.create('Rally.ui.grid.Grid', {
            itemId: 'piByStateGrid',
            store: aStore,
            width: 470,
            columnCfgs: [
                {
                    text:'State Name', dataIndex:'itsName', flex:3
                },
                {
                    text:'Story Count Total', dataIndex:'itsStoryCount', flex:1
                },
                {
                    text:'Plan Estimate Total', dataIndex:'itsStoryPlanEstimate', flex:1
                },
                {
                    text:'Aggregate Story Count Total', dataIndex:'itsAggregateStoryCount', flex:1
                },
                {
                    text:'Aggregate Plan Estimate Total', dataIndex:'itsAggregateStoryPlanEstimate', flex:1
                }
            ] // end columnCfgs
        });


        // render the PI by State grid
        var aPiByStateGridContainer = this.down('#piByStateGridContainer');
        aPiByStateGridContainer.removeAll(true);
        aPiByStateGridContainer.add(aGrid);

    }, // end _chartPiByState


    // ----------------------------------------------------
    // Process the supplied leaf story.  Its meta data
    // will be added to the appropriate story states.
    // ----------------------------------------------------
    _processPiStoryByState:function (theStoryStateMetaDataArray, theStoryRecord) {

        // check if array is empty
        if (theStoryStateMetaDataArray === null)
            return 1001;

        // grab the story's state from the story record
        var aStoryState = theStoryRecord.get("c_" + this.gKanbanStateFieldName);

        var len = theStoryStateMetaDataArray.length;

        // loop through each story meta data state
        for (var x = 0; x < len; x++) {
            var aStateMetaDataEntry = theStoryStateMetaDataArray[x];

            if (aStateMetaDataEntry === null)
                return 1002;

            //console.log("aStoryState                    : " + aStoryState);
            //console.log("aStateMetaDataEntry.itsName    : " + aStateMetaDataEntry.itsName);

            // the supplied story is either in this state or beyond it
            aStateMetaDataEntry.itsAggregateStoryCount += 1;
            aStateMetaDataEntry.itsAggregateStoryPlanEstimate += theStoryRecord.get("PlanEstimate") || 0;

            // check if the supplied story is in this state
            if (aStateMetaDataEntry.itsName === aStoryState) {
                aStateMetaDataEntry.itsStoryCount += 1;
                aStateMetaDataEntry.itsStoryPlanEstimate += theStoryRecord.get("PlanEstimate") || 0;
                return 0;
            }

        } // end loop through each story meta data state

        // state not found --- why did this happen?
        return 1003;

    }, // end _processPiStoryByState


    _logStateMetaDataArray:function (theStoryStateMetaDataArray) {

        console.log("----- _logStateMetaDataArray() -----");

        var len = theStoryStateMetaDataArray.length;
        console.log("len: " + len);

        for (var x = 0; x < len; x++) {

            var anEntry = theStoryStateMetaDataArray[x];

            if (anEntry !== null) {
                console.log("itsName: " + anEntry.itsName);
                console.log("itsStoryCount: " + anEntry.itsStoryCount);
                console.log("itsStoryPlanEstimate: " + anEntry.itsStoryPlanEstimate);
                console.log("itsAggregateStoryPlanEstimate: " + anEntry.itsAggregateStoryCount);
                console.log("itsAggregateStoryPlanEstimate: " + anEntry.itsAggregateStoryPlanEstimate);            }

        } // end loop through all entries in the story state meta data array

    } // end _logStateMetaDataArray

}); // end of Ext.define

