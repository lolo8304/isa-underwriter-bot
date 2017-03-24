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

var bot = new builder.UniversalBot(connector);

// Entity Constants
const ENTITIES = {
  BUSINESS_LINE: 'product::type',
  COUNTRY: 'builtin.geography.country',
  CUSTOMER: 'customer::name',
  NUMBER: 'builtin.number'
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
    const countries = _.map(builder.EntityRecognizer.findAllEntities(args.entities || [], ENTITIES.COUNTRY) || [], 'entity');
    const customer = (builder.EntityRecognizer.findEntity(args.entities || [], ENTITIES.CUSTOMER) || {}).entity;
    const businessLine = (builder.EntityRecognizer.findEntity(args.entities || [], ENTITIES.BUSINESS_LINE) || {}).entity;
    if (allowedBL.indexOf(businessLine) === -1) {
      session.endDialog('Sorry at this moment I can only help you with Property policies');
    } else if (countries.length && customer && businessLine) {
      var startDate = new Date().getTime();
      var endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);
      session.dialogData.program = {
        countries: countries,
        customer: {
          name: customer
        },
        businessLine: businessLine,
        startDate: startDate,
        endDate: endDate
      };
      session.send("I have created a **"+businessLine+"** program  for **"+customer+"** in countries **"+countries+"**");
      builder.Prompts.text(session,'What is the expected **global premium** starting tomorrow for 1 year');
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
  },
  function (session, results) {
    // Recognize the premium
    recognizer.recognize({ message: { text: results.response }, locale: 'en' }, (err, args) => {
      const premium = (builder.EntityRecognizer.findEntity(args.entities || [], ENTITIES.NUMBER) || {}).entity;
      if (args.intent === 'premium' && premium) {
        session.dialogData.program.premium = results.response;
        session.send("All set. Give me a few seconds to give you the best option");
      } else {
        // No premium provided it should repeat this step
        session.endDialog('Sorry at we need a figure for the premium. We have to start again');
      }
    });
  },
  function (session, results) {
          var msg = new builder.Message(session);
          msg.attachmentLayout(builder.AttachmentLayout.carousel)
          var attachments = [];
          session.dialogData.program.countries.forEach(function(country) {
            attachments.push(
              new builder.HeroCard(session)
                  .title(country)
                  .subtitle("Program Premium: "+session.dialogData.program.premium)
                  .text("The recommended options **"+country+"** are)")
                  .images([builder.CardImage.create(session, 'http://petersapparel.parseapp.com/img/whiteshirt.png')])
                  .buttons([
                      builder.CardAction.imBack(session, "choose program integrated for "+country, "integrated"),
                      builder.CardAction.imBack(session, "choose program coordinated for "+country, "coordinated"),
                      builder.CardAction.imBack(session, "choose program fos for "+country, "fos/fee of service")
                  ])
            );
          });
          msg.attachments(attachments);
          session.send(msg);    
  }
]);
