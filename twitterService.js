var config = require("./config"),
  Twit = require('twit'),
  twit = new Twit(config.twitCred),
  stream = twit.stream('user'),
  shortResponses = config.shortResponses;

function tweet(text){
  var parameters = {
    status: text,
    trim_user: shortResponses
  };

  console.log("Tweeting: " + parameters.status);

  twit.post('statuses/update', parameters, postCallback);
}

function tweetAt(name, text){
  var prefix = "@" + name + "\n";

  tweet(prefix + text);
}

function postCallback(err, data, response){
  if(err){
    console.log("Failed with: " + err.message);
  } else {
    console.log("Successfully tweeted");
  }
}

module.exports = {
  tweet: tweet,
  tweetAt: tweetAt,
  stream: stream
}
