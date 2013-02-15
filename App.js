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
            // panel where we will place the grid for the PI's leaf stories by state
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

    gKanbanStateFieldName: "MikeBan",
    //gKanbanStateFieldName: "KanbanState",

    gStateMetaDataArray: [],            // array to hold the PI's leaf story meta data per state

    gPiObjectID: undefined,             // PI object ID to breakdown upon initial load
    gPiFormattedID: undefined,          // PI formatted ID
    gPiName: undefined,                 // PI name
    gPiPlanEstTotal: undefined,    // PI plan estimate total

    // --- end global variables ---


    _fireChooser:function () {

        // Chooser to select PI to retrieve the leaf stories for

        Ext.create('Rally.ui.dialog.ChooserDialog', {
            artifactTypes:['PortfolioItem'],
            autoShow:true,
            title:'Select Portfolio Item',
            limit:20,
            height:500,
            listeners:{
                artifactChosen:function (selectedRecord) {

                    this.gPiFormattedID = selectedRecord.get('FormattedID');
                    this.gPiObjectID = selectedRecord.get('ObjectID');
                    this.gPiName = selectedRecord.get("Name");

                    this._getPiInfo();
                },
                scope:this
            }
        });
    },

    launch:function () {

        // main function

        // process this App's preferences
        // STUBBING OUT FOR NOW...the LBAPI query is not working
        // for the initial PI upon App load/refresh
        //this._processAppPrefs();


        // we need to determine the order of states via the WSAPI model
        this._getStoryModel();

    }, // end launch


    // ----------------------------------------------------
    // process the App's preferences:
    //      "piObjectID" - undefined or object ID of PI to use upon App load
    // ----------------------------------------------------

    _processAppPrefs:function () {

        // log out the App's settings
        console.log("App's original preference settings");
        console.log(this.settings);

        // grab PI info to use upon initial load (might be undefined)
        this.gPiObjectID = this.getSetting("piObjectID");
        this.gPiFormattedID = this.getSetting("piFormattedID");
        this.gPiName = this.getSetting("piName");

        console.log("App's preferences retrieved");
        console.log("this.gPiObjectID: " + this.gPiObjectID);
        console.log("this.gPiFormattedID: " + this.gPiFormattedID);
        console.log("this.gPiName: " + this.gPiName);

    }, // end _processAppPrefs()


    // ----------------------------------------------------
    // update the App's preferences:
    //      "piObjectID" - save the object ID of PI to use upon next App load
    // ----------------------------------------------------

    _updateAppPrefs:function () {

        console.log(this.settings);

        // capture App's scope to reference upon success
        var appScope = this;


        this.updateSettingsValues({
            settings: {
                piObjectID: this.gPiObjectID,
                piFormattedID: this.gPiFormattedID,
                piName: this.gPiName
            },
            success: function(updatedSettings){
                console.log("Success: updateSettingsValues() worked!");

                //that._expWithSettings();

            },
            failure: function(){
                console.log("Failure: updateSettingsValues() failed!");
            }
        });

    }, // end _updateAppPrefs()


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
            aState.itsCount = 0;
            aState.itsPlanEst = 0;
            aState.itsAggCount = 0;
            aState.itsAggPlanEst = 0;
            aState.itsPctComp = "n/a";
        }

    }, // end _resetStateMetaDataArray


    // ----------------------------------------------------
    // retrieve the story model from WSAPI so we can determine
    // what STATES are allowed
    // ----------------------------------------------------
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
                // populate the state's values
                appScope._populateStates(model);

                // now add the form's controls to the page (PI name/dates/etc. and the select PI button)
                appScope._addAppControls();

                // check if a PI is already set in preferences
                if (appScope.gPiObjectID !== null && appScope.gPiObjectID !== undefined){
                    console.log("Preferences contain a PI to use upon load");

                    // start w/ PI stored in preferences
                    appScope._getPiInfo();

                }

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

        var stateField = theStoryModel.getField(this.gKanbanStateFieldName);

        nbrAllowedValues = stateField.allowedValues.length;
        console.log("nbrAllowedValues: " + nbrAllowedValues);

        // prepopulate states with each of the allowed values
        for (var ndx = 0; ndx < nbrAllowedValues; ndx++){

            // localize the allowed value
            aValue = stateField.allowedValues[ndx].StringValue;
            //console.log("aValue: " + aValue);

            // populate initial entry for this state
            var storyStateMetaData = new Object();
            storyStateMetaData.itsName = aValue;
            storyStateMetaData.itsCount = 0;
            storyStateMetaData.itsPlanEst = 0;
            storyStateMetaData.itsAggCount = 0;
            storyStateMetaData.itsAggPlanEst = 0;

            // add it to the state array
            this.gStateMetaDataArray.push(storyStateMetaData);

        } // end loop through all allowed values

        //console.log("Exit _populateStates");
    },


    // ----------------------------------------------------
    // add the initial controls to the App (PI fields, choose PI button, etc.)
    // ----------------------------------------------------
    _addAppControls:function (){

        // add "select PI" button to header
        var piHeaderContainer = this.down('#piHeaderContainer');
        piHeaderContainer.add({
            xtype:'rallybutton',
            text:'Select Portfolio Item',
            listeners:{
                click: this._fireChooser,
                scope: this
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
    // the PI chooser button has been fired...
    // now it is time to go get the selected PI's data
    // ----------------------------------------------------
    _getPiInfo:function () {

        this._reset();


        console.log("_getPiInfo() - this.gPiObjectID: " + this.gPiObjectID);

        var store = Ext.create('Rally.data.WsapiDataStore', {
            model: 'PortfolioItem',
            fetch: ["ObjectID", "Name", "ActualStartDate", "PlannedEndDate", "LeafStoryCount", "LeafStoryPlanEstimateTotal"],
            // scope globally
            context: {
                project:null
            },
            filters: [
                {
                    property: 'ObjectID',
                    operator: '=',
                    value: this.gPiObjectID
                }
            ],
            limit: Infinity,
            autoLoad: true,
            listeners: {
                load:function (store, data, success) {

                    // map release OIDs to release NAMES
                    this._getLeafStoriesInPi(data);

                },
                scope:this
            }
        });

    }, // end _getPiInfo


    // ----------------------------------------------------
    // after PI selected, query for all its leaf level stories
    // ----------------------------------------------------
    _getLeafStoriesInPi:function (thePiRecords) {

        // ----- BEGIN: grab the PI's fields
        var nbrPiRecords;

        nbrPiRecords = thePiRecords.length;
        console.log("nbrPiRecords: " + nbrPiRecords);

        // we should only get a single record back for the PI we query for
        if (nbrPiRecords !== 1) {
            alert("Error: Multiple Portfolio Items Fetched for this Object ID");
            return;
        }

        this.gPiPlanEstTotal = thePiRecords[0].get("LeafStoryPlanEstimateTotal");

        var piActualStartDate = thePiRecords[0].get("ActualStartDate");
        var piPlannedEndDate = thePiRecords[0].get("PlannedEndDate");

        var piTextBox = this.down('#piTextBox');
        piTextBox.update('<br><font size="3"><b>Portfolio Item: </b>' + this.gPiFormattedID + " - " + this.gPiName + "</font>");

        var piActualStartDateTextBox = this.down('#piActualStartDateTextBox');
        piActualStartDateTextBox.update('<font size="2"><b>Actual Start Date: </b>' + piActualStartDate + "</font>");

        var piPlannedEndDateTextBox = this.down('#piPlannedEndDateTextBox');
        piPlannedEndDateTextBox.update('<font size="2"><b>Planned End Date: </b>' + piPlannedEndDate + "</font>");

        // ----- END: grab the PI's fields


        // ----- BEGIN: query the LBAPI for all of the PI's leaf stories

        // set query config info
        var query = {
            "__At":"current",
            "_TypeHierarchy":"HierarchicalRequirement",
            "Children":null,
            "_ItemHierarchy":this.gPiObjectID
        };

        var queryString = Ext.JSON.encode(query);

        console.log("query: " + query);
        console.log("queryString: " + queryString);

        // set fields to retrieve
        var find = ["ObjectID", "_UnformattedID", "Name", "Release", "ScheduleState", "PlanEstimate", "c_" + this.gKanbanStateFieldName];

        // set context to global across the workspace
        var context = this.getContext().getDataContext();

        // clear context's project
        context.project = undefined;

        // capture App's scope
        var appScope = this;

        // fetch the snapshot of all leaf level stories for the PI
        var ssPiLeafStories = Ext.create('Rally.data.lookback.SnapshotStore', {
            context: {
                workspace: this.context.getWorkspace(),
                project: this.context.getProject()
            },
            pageSize: 10000000,
            fetch: find,
            //rawFind: queryString,
            rawFind: query,
            hydrate: ["ScheduleState", "c_" + this.gKanbanStateFieldName],
            autoLoad: true,
            listeners: {
                load:function (store, data, success) {

                    // map release OIDs to release NAMES
                    appScope._processPiLeafStories(store, data);

                },
                scope: this
            }

        });

        // ----- END: query the LBAPI for all of the PI's leaf stories


    }, // end _getStoriesInPi


    // ----------------------------------------------------
    // output the PI's leaf stories in a grid and then call
    // routine to bucket them by STATE
    // ----------------------------------------------------
    _processPiLeafStories:function (theStore, theRecords) {

        console.log("Enter _processPiLeafStories()");

        // spit out all leaf stories into a grid
        var snapshotGrid = Ext.create('Rally.ui.grid.Grid', {
            title: 'Snapshots',
            store: theStore,
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


        // time to start processing the PI's leaf stories by their state
        this._processAllPiStoriesByState(theRecords);

        // calc each STATE's % of completion
        // ex. 100% stories estimated, 80% developed, 50% completed, 40% accepted
        this._calcPiByStateCompletion(this.gStateMetaDataArray);

        //this._logStateMetaDataArray(this.gStateMetaDataArray);

        this._chartPiByState(this.gStateMetaDataArray);

        // save PI info into preferences
        this._updateAppPrefs();

        console.log("Exit _processPiLeafStories()");

    }, // end _processPiLeafStories


    // ----------------------------------------------------
    // process all PI's leaf stories by STATE
    // ----------------------------------------------------
    _processAllPiStoriesByState:function (theStoryRecords) {

        // clear any prior state meta data
        this._resetStateMetaDataArray();

        var nbrStories = theStoryRecords.length;
        console.log("# PI Leaf Stories: " + nbrStories);

        // loop through each of the PI's stories
        for (var storyNdx = 0; storyNdx < nbrStories; storyNdx++) {

            var aStoryRecord = theStoryRecords[storyNdx];

            if (aStoryRecord !== null) {

                //console.log("Story Name: " + aStoryRecord.get("Name"));

                // process this PI leaf story
                var rc = this._processPiStoryByState( this.gStateMetaDataArray, aStoryRecord);

                if (rc !== 0 ) {
                    console.log("*** Error updating the story state meta data array ***");
                    console.log("rc: " + rc);
                    return rc;
                }

            } // end story record is not null

        } // end loop for all story records

    }, // end _processPiStoriesByState


    // ----------------------------------------------------
    // Process the supplied leaf story.  Its meta data
    // will be added to the appropriate story states.
    // ----------------------------------------------------
    _processPiStoryByState:function (theStoryStateMetaDataArray, theStoryRecord) {

        //console.log("***  Enter _processPiStoryByState ***");

        // check if array is empty
        if (theStoryStateMetaDataArray === null)
            return 1001;

        // grab the story's state from the story record
        var aStoryState = theStoryRecord.get("c_" + this.gKanbanStateFieldName);
        //console.log("aStoryState: " + aStoryState);

        var len = theStoryStateMetaDataArray.length;

        // loop through each story meta data state
        for (var x = 0; x < len; x++) {
            var aStateMetaDataEntry = theStoryStateMetaDataArray[x];

            if (aStateMetaDataEntry === null)
                return 1002;

            //console.log("aStateMetaDataEntry.itsName    : " + aStateMetaDataEntry.itsName);

            // the supplied story is either in this state or beyond it
            aStateMetaDataEntry.itsAggCount += 1;
            aStateMetaDataEntry.itsAggPlanEst += theStoryRecord.get("PlanEstimate") || 0;

            // check if the supplied story is in this state
            if (aStateMetaDataEntry.itsName === aStoryState) {
                aStateMetaDataEntry.itsCount += 1;
                aStateMetaDataEntry.itsPlanEst += theStoryRecord.get("PlanEstimate") || 0;
                return 0;
            }

        } // end loop through each story meta data state

        // state not found --- we encountered a state no longer used/valid

        // populate initial entry for this "old" state.  Although the state may no longer
        // be valid, there could be story's still referencing it that have yet to be updated.
        var anOldState = new Object();
        anOldState.itsName = aStoryState;
        anOldState.itsCount = 1;
        anOldState.itsPlanEst = theStoryRecord.get("PlanEstimate") || 0;
        anOldState.itsAggCount = 1;
        anOldState.itsAggPlanEst = theStoryRecord.get("PlanEstimate") || 0;

        // add it to the state array
        theStoryStateMetaDataArray.push(anOldState);

        console.log("WARNING: Accounting for an invalid STATE: " + aStoryState);

        return 0;

    }, // end _processPiStoryByState


    // ----------------------------------------------------
    // Calc each STATE's % of completion.  For example:
    // 100% estimated
    // 80%  developed
    // 50%  completed
    // 40%  accepted
    // ----------------------------------------------------
    _calcPiByStateCompletion:function (theStoryStateMetaDataArray) {

        console.log("Enter _calcPiByStateCompletion()");

        var nbrStates = theStoryStateMetaDataArray.length;
        console.log("len: " + nbrStates);

        for (var x = 0; x < nbrStates; x++) {

            var anEntry = theStoryStateMetaDataArray[x];

            if (anEntry !== null) {

                console.log("anEntry.itsName: " + anEntry.itsName);
                console.log("anEntry.itsAggPlanEst: " + anEntry.itsAggPlanEst);
                console.log("this.gPiPlanEstTotal: " + this.gPiPlanEstTotal);

                anEntry.itsPctComp =
                                anEntry.itsAggPlanEst /
                                this.gPiPlanEstTotal *
                                100;

                console.log("anEntry.itsPctComp: " + anEntry.itsPctComp);
            }

        } // end loop through all entries in the story state meta data array

        console.log("Exit _calcPiByStateCompletion()");
    },


    // chart out the PI's bucketed by kanban state
    _chartPiByState:function (theStoryStateMetaDataArray) {

        // define a custom  model
        var aModel = Ext.define('CustomStateModel', {
            extend: 'Ext.data.Model',
            fields: [
                {name:'itsName', type:'string'},
                {name:'itsCount', type:'int'},
                {name:'itsPlanEst', type:'int'},
                {name:'itsAggCount', type:'int'},
                {name:'itsAggPlanEst', type:'int'},
                {name:'itsPctComp', type:'int'}
            ]
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
                    text:'Story Count Total', dataIndex:'itsCount', flex:1
                },
                {
                    text:'Plan Estimate Total', dataIndex:'itsPlanEst', flex:1
                },
                {
                    text:'Aggregate Story Count Total', dataIndex:'itsAggCount', flex:1
                },
                {
                    text:'Aggregate Plan Estimate Total', dataIndex:'itsAggPlanEst', flex:1
                },
                {
                    text:'% Complete', dataIndex:'itsPctComp', flex:1
                }
            ] // end columnCfgs
        });


        // render the PI by State grid
        var aPiByStateGridContainer = this.down('#piByStateGridContainer');
        aPiByStateGridContainer.removeAll(true);
        aPiByStateGridContainer.add(aGrid);

    }, // end _chartPiByState


    _logStateMetaDataArray:function (theStoryStateMetaDataArray) {

        console.log("----- _logStateMetaDataArray() -----");

        var len = theStoryStateMetaDataArray.length;
        console.log("len: " + len);

        for (var x = 0; x < len; x++) {

            var anEntry = theStoryStateMetaDataArray[x];

            if (anEntry !== null) {
                console.log("itsName: " + anEntry.itsName);
                console.log("itsCount: " + anEntry.itsCount);
                console.log("itsPlanEst: " + anEntry.itsPlanEst);
                console.log("itsAggCount: " + anEntry.itsAggCount);
                console.log("itsAggPlanEst: " + anEntry.itsAggPlanEst);
                console.log("itsPctComp: " + anEntry.itsPctComp);
            }
        } // end loop through all entries in the story state meta data array

    } // end _logStateMetaDataArray

}); // end of Ext.define

