'use strict';

/**
 * This is a demo showcasing a simple sap conversational ui build with the Amazon Alexa Skills Kit.
 */


// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: 'PlainText',
            text: output,
        },
        card: {
            type: 'Simple',
            title: `SessionSpeechlet - ${title}`,
            content: `SessionSpeechlet - ${output}`,
        },
        reprompt: {
            outputSpeech: {
                type: 'PlainText',
                text: repromptText,
            },
        },
        shouldEndSession,
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: '1.0',
        sessionAttributes,
        response: speechletResponse,
    };
}


// --------------- Functions that control the skill's behavior -----------------------

function getWelcomeResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    const sessionAttributes = {};
    const cardTitle = 'Welcome';
    const speechOutput = 'Welcome to the MediaMarktSaturn Conversational SAP Demo with Alexa. ' +
        'How can I help you?';
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    const repromptText = 'Please ask me a question by saying, ' +
        'What is the delivery date for 4502830392';
    const shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function handleSessionEndRequest(callback) {
    const cardTitle = 'Session Ended';
    const speechOutput = 'Thank you for using MediaMarktSaturn Conversational SAP. Have a nice day!';
    // Setting this to true ends the session and exits the skill.
    const shouldEndSession = true;

    callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
}

function setDeliveryIntentSession(intent, session, callback) {
    let sessionAttributes = {};
    const cardTitle = intent.name;
    let speechOutput = '';
    let repromptText = '';
    const shouldEndSession = false;

    // Get the Utterance variables
    const myPurchaseOrderSlot = intent.slots.PurchaseOrder;
    console.log("==> Called Intent:" + cardTitle + "Slot:" + myPurchaseOrderSlot);

    if (myPurchaseOrderSlot) {

        const myPurchaseOrder = myPurchaseOrderSlot.value;

        speechOutput = `Here are your informations for Purchase Order ${myPurchaseOrder}.`;
        repromptText = null;

        var http = require('http');

        const hostname = "http://xx.xxx.xxx.xxx:8000/";
        var path = "sap/opu/odata/sap/ZCC_GETPURCHASEORDERDATA_CDS/";
        var entitySet = "ZCC_GetPurchaseOrderData";
        var filter = "/?$filter=PurchaseOrder eq '";
        var format = "'&$format=json"; //
        var uri = hostname + path + entitySet + filter + myPurchaseOrder + format;

        console.log("Get data from: " + uri);

        http.get(uri, function(response) {
            console.log(uri);
            console.log('GET status: ' + response.statusCode);

            var rawData = '';

            response.on('data', function(chunck) {
                console.log('BODY: ' + chunck);
                console.log(chunck);
                rawData += chunck;
                var parsedData = JSON.parse(rawData);
                var myData = parsedData.d.results;

                var myDeliveryDate;
                var mySupplierName;

                myData.forEach(function(myData){
                    mySupplierName = (myData.SupplierName);
                    var jsonDate = (myData.DeliveryDate);
                    function parseJsonDate(jsonDateString){
                        return new Date(parseInt(jsonDateString.replace('/Date(', '')));
                    }
                    var parsedDate = parseJsonDate(jsonDate);
                    var month = parsedDate.getMonth() + 1;
                    var day = parsedDate.getDate();
                    var year = parsedDate.getFullYear();

                    myDeliveryDate = day + "/" + month + "/" + year;
                });

                console.log(myDeliveryDate);

                speechOutput = `'Purchase Order ${myPurchaseOrder} is due for delivery on ${myDeliveryDate}. Considering the lead time for ${mySupplierName} the Purchase Order should get submitted latest tomorrow. '`;
                callback(sessionAttributes,
                    buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));

            });

        });


    } else {
        speechOutput = "Sorry I'm not speaking bavarian. Please try again.";
        repromptText = null;
        callback(sessionAttributes,
            buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    }
}

function setStatusIntentSession(intent, session, callback) {
    let sessionAttributes = {};
    const cardTitle = intent.name;
    let speechOutput = '';
    let repromptText = '';
    const shouldEndSession = false;

    // Get the Utterance variables
    const mySupplierNameSlot = intent.slots.SupplierName;
    console.log("==> Called Intent:" + cardTitle + "Slot:" + mySupplierNameSlot);

    if (mySupplierNameSlot) {

        const mySupplierName = mySupplierNameSlot.value;

        speechOutput = `Here are the open Purchase Orders for ${mySupplierName}`;
        repromptText = null;

        var http = require('http');

        const hostname = "http://xx.xxx.xxx.xxx:8000/";
        var path = "sap/opu/odata/sap/ZCC_GETPURCHASEORDERDATA_CDS/";
        var entitySet = "ZCC_GetPurchaseOrderData";
        var filter1 = "/?$filter=(SupplierName eq '";
        var filter2 = "') and (OverallStatus eq 'P')";
        var format = "&$format=json"; //
        var uri = hostname + path + entitySet + filter1 + mySupplierName + filter2 + format;

        console.log("Get data from: " + uri);

        http.get(uri, function(response) {
            console.log(uri);
            console.log('GET status: ' + response.statusCode);

            var rawData = '';

            response.on('data', function(chunck) {
                console.log('BODY: ' + chunck);
                console.log(chunck);
                rawData += chunck;
                var parsedData = JSON.parse(rawData);
                var myData = parsedData.d.results;

                //count
                var myResult = Object.keys(myData).length;
                console.log(myResult);

                var myStatus;
                var myPurchaseOrder = [ ];

                myData.forEach(function(myData){
                    console.log(myData.PurchaseOrder);
                    myPurchaseOrder.push(myData.PurchaseOrder);
                    var jsonOverallStatus = (myData.OverallStatus);

                    if (jsonOverallStatus === 'A') {
                        myStatus = 'Approved';
                    } else if (jsonOverallStatus === 'P') {
                        myStatus = 'Awaiting Approval';
                    } else if (jsonOverallStatus === 'R') {
                        myStatus = 'Rejected by Approver';
                    } else if (jsonOverallStatus === 'S') {
                        myStatus = 'Sent';
                    } else if (jsonOverallStatus === 'F') {
                        myStatus = 'Confirmed';
                    } else if (jsonOverallStatus === 'D') {
                        myStatus = 'Delivered';
                    } else if (jsonOverallStatus === 'I') {
                        myStatus = 'Invoiced';
                    } else if (jsonOverallStatus === 'X') {
                        myStatus = 'Canceled';
                    } else if (jsonOverallStatus === 'J') {
                        myStatus = 'Rejected by Supplier';
                    } else if (jsonOverallStatus === 'C') {
                        myStatus = 'Completed';
                    } else {
                        myStatus = 'No status information available';
                    }

                });

                console.log(myStatus);

                speechOutput = `You have ${myResult} open Purchase Order from ${mySupplierName}. Purchase Order Number ${myPurchaseOrder}. '`;
                callback(sessionAttributes,
                    buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));

            });

        });

    } else {
        speechOutput = "Sorry I'm not speaking bavarian. Please try again.";
        repromptText = null;
        callback(sessionAttributes,
            buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    }
}

function setContentIntentSession(intent, session, callback) {
    let sessionAttributes = {};
    const cardTitle = intent.name;
    let speechOutput = '';
    let repromptText = '';
    const shouldEndSession = false;

    // Get the Utterance variables
    const myPurchaseOrderSlot = intent.slots.PurchaseOrder;
    console.log("==> Called Intent:" + cardTitle + "Slot:" + myPurchaseOrderSlot);

    if (myPurchaseOrderSlot) {

        const myPurchaseOrder = myPurchaseOrderSlot.value;

        speechOutput = `Here are your informations for Purchase Order ${myPurchaseOrder}.`;
        repromptText = null;

        var http = require('http');

        const hostname = "http://xx.xxx.xxx.xxx:8000/";
        var path = "sap/opu/odata/sap/ZCC_GETPURCHASEORDERDATA_CDS/";
        var entitySet = "ZCC_GetPurchaseOrderData";
        var filter = "/?$filter=PurchaseOrder eq '";
        var format = "'&$format=json"; //
        var uri = hostname + path + entitySet + filter + myPurchaseOrder + format;

        console.log("Get data from: " + uri);

        http.get(uri, function(response) {
            console.log(uri);
            console.log('GET status: ' + response.statusCode);

            var rawData = '';

            response.on('data', function(chunck) {
                console.log('BODY: ' + chunck);
                console.log(chunck);
                rawData += chunck;
                var parsedData = JSON.parse(rawData);
                var myData = parsedData.d.results;

                var myProductDescription;
                var myQuantity;

                myData.forEach(function(myData){
                    myProductDescription = (myData.ProductDescription);
                    var Quantity = (myData.Quantity);
                    myQuantity = Quantity.substr(0, Quantity.length-4);
                });

                console.log(myProductDescription, myQuantity);

                speechOutput = `You will receive ${myQuantity} pieces of ${myProductDescription} with Purchase Order ${myPurchaseOrder}. '`;
                callback(sessionAttributes,
                    buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));

            });

        });


    } else {
        speechOutput = "Sorry I'm not speaking bavarian. Please try again.";
        repromptText = null;
        callback(sessionAttributes,
            buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    }
}


// --------------- Events -----------------------

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log(`onSessionStarted requestId=${sessionStartedRequest.requestId}, sessionId=${session.sessionId}`);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log(`onLaunch requestId=${launchRequest.requestId}, sessionId=${session.sessionId}`);

    // Dispatch to your skill's launch.
    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log(`onIntent requestId=${intentRequest.requestId}, sessionId=${session.sessionId}`);

    const intent = intentRequest.intent;
    const intentName = intentRequest.intent.name;

    // Dispatch to your skill's intent handlers
    if (intentName === 'DeliveryIntent') {
        setDeliveryIntentSession(intent, session, callback);
    } else if (intentName === 'StatusIntent') {
        setStatusIntentSession(intent, session, callback);
    } else if (intentName === 'ContentIntent') {
        setContentIntentSession(intent, session, callback);
    } else if (intentName === 'AMAZON.HelpIntent') {
        getWelcomeResponse(callback);
    } else if (intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent') {
        handleSessionEndRequest(callback);
    } else {
        throw new Error('Invalid intent');
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log(`onSessionEnded requestId=${sessionEndedRequest.requestId}, sessionId=${session.sessionId}`);
    // Add cleanup logic here
}


// --------------- Main handler -----------------------

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = (event, context, callback) => {
    try {
        console.log(`event.session.application.applicationId=${event.session.application.applicationId}`);

        /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */
        /*
        if (event.session.application.applicationId !== 'amzn1.echo-sdk-ams.app.[unique-value-here]') {
             callback('Invalid Application ID');
        }
        */

        if (event.session.new) {
            onSessionStarted({ requestId: event.request.requestId }, event.session);
        }

        if (event.request.type === 'LaunchRequest') {
            onLaunch(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'IntentRequest') {
            onIntent(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'SessionEndedRequest') {
            onSessionEnded(event.request, event.session);
            callback();
        }
    } catch (err) {
        callback(err);
    }
};
