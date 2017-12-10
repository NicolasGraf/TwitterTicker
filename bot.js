var config = require('./config'),
    twitterService = require('./twitterService'),
    apiService = require('./apiService'),
    emojis = require('./emojis'),
    util = require('./util'),
    schedule = require('node-schedule'),
    {Pool, Client} = require('pg'),
    pool = null,
    userStream = twitterService.stream,
    cronJobs = [];

//INIT
function init(){
  //Listen for tweets, replies, follows
  userStream.on('follow', onFollow);
  userStream.on('replies', onReply);
  userStream.on('tweet', onTweet);

  //Get all saved users from DB
  pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  pool.query('select * from ticker_jobs', (err, res) => {
    if(res != null){
      var rows = res.rows;
      for(var i = 0; i < rows.length; i++){
        setCronjob(rows[i].frequency, rows[i].name, rows[i].coin_id, rows[i].currency);
      }
    }
  });

  //Setup the daily tweeting
  cronJobs.push(schedule.scheduleJob('0 12 * * *', getAndTweetTop5));

  //getAndTweetTop5();
  //sendInfos("nick", "bitcoin", "eur");
}

init();

//////////////////
// CORE
//////////////////
function getAndTweetTop5(){
  var introMsg = "Today's Top 5 Coins " + emojis.graph + " \n\n",
    coinStrings = [],
    hashtags = [
      "#bitcoin",
      "#crypto",
      "#altcoin",
      "#bot",
      "#" + emojis.graph
    ];

  apiService.getTickerData(5, null, null, null, function(data){
    for(var i = 0; i < data.length; i++){
      var coin = data[i].rank + ". " + data[i].name + " " + data[i].price_usd + "$ ";

      if(parseInt(data[i].percent_change_24h) > 0){
        coin += emojis.arrow_up;
      } else {
        coin += emojis.arrow_down;
      }

      coinStrings.push(coin);
    }
    var status = introMsg + coinStrings.join("\n") + "\n" + hashtags.join(" ");
    twitterService.tweet(status);
  });
}

function sendInfos(name, coin, currency){
  var introMsg = "Your stats for ",
    infoStrings = [],
    hashtags = [
      "#crypto",
      "#altcoin",
      "#bot",
      "#" + emojis.graph
    ];

  apiService.getTickerData(null, null, currency, coin, function(data){
    if(data){
      var item = data[0],
        currUpper = currency.toUpperCase(),
        currLower = currency.toLowerCase();

      infoStrings.push(introMsg.concat(item.name, " ", emojis.graph, "\n"));
      infoStrings.push("Rank: " + item.rank);

      if(currUpper != "USD"){
         infoStrings.push("Price USD: " + parseFloat(item.price_usd).toFixed(2) + "$");
      }

      infoStrings.push("Price ".concat(currUpper, ": ", parseFloat(item["price_" + currLower]).toFixed(2), util.getCurrencySign(currUpper)));

      infoStrings.push("Trend 1h: " + item.percent_change_1h + "% " +
      util.getTrendArrow(item.percent_change_1h));

      infoStrings.push("Trend 24h: " + item.percent_change_24h + "% " +
      util.getTrendArrow(item.percent_change_24h));

      infoStrings.push("Trend 7d: " + item.percent_change_7d + "% " +
      util.getTrendArrow(item.percent_change_7d));

      hashtags.unshift("#" + item.name);

      var infos = infoStrings.join("\n") + "\n\n" + hashtags.join(" ");

      // twitterService.tweetAt(name, infos);
      console.log(infos);
    }
  });
}

function setCronjob(frequency, target, coin, currency){
  console.log("Set up a cron Job to tweet @" + target + " every " + frequency + " hours");

  cronJobs.push(schedule.scheduleJob('0 */' + frequency + ' * * *', function(){
    sendInfos(target, coin, currency);
  }));
}

function executeQuery(query){
  console.log("Executing following Query: " + query);

  pool.query(query, (err, res) => {
    if(err){
      console.log(err);
    } else {
      console.log(res);
    }
  });
}

function saveTickerJob(name, coin, currency, frequency){
  var query = "insert into ticker_jobs values('" + name + "', '" + coin + "', '" + currency + "', " + frequency + ")";

  executeQuery(query);
}

function onTweet(e){
  if(e.user.screen_name !== config.appName){

    console.log("@" + e.user.screen_name + " tweeted at you");
    console.log("The tweet reads: " + e.text);

    var params = util.filterInput(e.text, e.user.screen_name);

    saveTickerJob(params.name, params.coin, params.currency, params.frequency);

    setCronjob(params.frequency, params.name, params.coin, params.currency);
  }
}

function onFollow(e){
  setTimeout(function(){
    //Event also triggers when we follow someone
    if(e.source.name != config.appName) {

      console.log(e.source.name + " followed you");
    } else {
      console.log("You are now following " + e.target.screen_name);
    }
  }, 3000);
}

function onReply(e){
  console.log("You got a reply from: @" + e.source.screen_name);
  console.log("It reads: " + e.source.text);
}

//sina ist cool;
