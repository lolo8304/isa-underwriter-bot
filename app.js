/*-----------------------------------------------------------------------------
A simple echo bot for the Microsoft Bot Framework. 
-----------------------------------------------------------------------------*/

var builder = require('./core/');
var restify = require('restify');
var request = require('request');
var _ = require('lodash');


// Setup Restify Server
var server = restify.createServer();
var port = process.env.port || process.env.PORT || 3978;

server.listen(port, function () {
  console.log('%s listening to %s', server.name, server.url);
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
  appId: '17234ed8-f81b-42bf-9463-76267cb00426',
  appPassword: 'JkwFVC9ediOzxdLbbTL4So6'
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());

var bot = new builder.UniversalBot(connector);//, [init]);

// Entity Constants
const ENTITIES = {
  COUNTRY: 'builtin.geography.country',
  CUSTOMER: 'customer::name',
  BUSINESS_LINE: 'product::type'
};

// Add global LUIS recognizer to bot
var model = process.env.MICROSOFT_LUIS_MODEL || 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/05b2c787-1ca4-4d2c-8ae2-d50b64aed1da?subscription-key=28b3680a656742328525a2a4749646a9&verbose=true&q=';
var recognizer = new builder.LuisRecognizer(model);
var dialog = new builder.IntentDialog({ recognizers: [recognizer] });
bot.dialog('/', dialog);

dialog.onDefault(
 builder.DialogAction.send('Sorry - I did not understand. Try again')
);

dialog.matches('intro', [
  function (session, args, next) {
    builder.Prompts.text(session, 'Hi there. I am Isa.\n\nI am here to help you find the best solution for your policies.\n\nIf you need any help, you can type "help" followed by your question at any time.');
    session.endDialog('Please, describe the risk the customer wants to insure.');
  }
]);

const allowedBL = ['property'];

dialog.matches('risk', [
  function (session, args, next) {
    const countries = _.map(builder.EntityRecognizer.findAllEntities(args.entities, ENTITIES.COUNTRY) || [], 'entity');
    const customer = (builder.EntityRecognizer.findEntity(args.entities, ENTITIES.CUSTOMER) || {}).entity;
    const businessLine = (builder.EntityRecognizer.findEntity(args.entities, ENTITIES.BUSINESS_LINE) || {}).entity;
    if (allowedBL.indexOf(businessLine) === -1) {
      session.endDialog('Sorry at this moment I can only help you with Property policies');
    } else if (countries.length && customer && businessLine) {
      builder.Prompts.text(session, 'Please, describe the risk the customer wants to insure.');
    }
    /*
    if (!countries.length) {
      // No countries provided
    }
    if (!customer) {
      // No customer
    }
    if (!businessLine) {
      // No businessLine
    }
    */
  }
]);