var config = require('./config'),
    twitterService = require('./twitterService'),
    apiService = require('./apiService'),
    emojis = require('./emojis'),
    schedule = require('node-schedule'),
    path = require('path'),
    {Pool, Client} = require('pg'),
    userStream = twitterService.stream,
    seconds = 1000,
    minutes = seconds * 60,
    hours = minutes * 60,
    apiData = [],
    myName = "AltcoinTicker",
    cronJobs = [],
    fans = [];

function init(){
  //Listen for tweets, replies, follows
  userStream.on('follow', onFollow);
  userStream.on('replies', onReply);
  userStream.on('tweet', onTweet);

  //Get all saved users from DB
  var pool = new Pool({
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
  sendInfos("nick", "bitcoin", "usd");
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

function setCronjob(frequency, target, coin, currency){
  console.log("Set up a cron Job to tweet @" + target + " every " + frequency + " hours");

  cronJobs.push(schedule.scheduleJob('0 */' + frequency + ' * * *', function(){
    sendInfos(target, coin, currency);
  }));
}

function insertIntoDB(query){
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

  insertIntoDB(query);
}

function onTweet(e){
  if(e.user.screen_name !== myName){

    console.log("@" + e.user.screen_name + " tweeted at you");
    console.log("The tweet reads: " + e.text);

    var params = filterInput(e.text, e.user.screen_name);

    saveTickerJob(params.name, params.coin, params.currency, params.frequency);

    setCronjob(params.frequency, params.name, params.coin, params.currency);
  }
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
         infoStrings.push("Price USD: " + parseFloat(item.price_usd).toFixed(2) + " $");
      }

      infoStrings.push("Price ".concat(currUpper, ": ", parseFloat(item["price_" + currLower]).toFixed(2), getCurrencySign(currUpper)));

      infoStrings.push("Trend 1h: " + item.percent_change_1h + "% " + getTrendArrow(item.percent_change_1h));
      infoStrings.push("Trend 24h: " + item.percent_change_24h + "% " + getTrendArrow(item.percent_change_24h));
      infoStrings.push("Trend 7d: " + item.percent_change_7d + "% " + getTrendArrow(item.percent_change_7d));

      hashtags.unshift("#" + item.name);

      var infos = infoStrings.join("\n") + "\n\n" + hashtags.join(" ");

      twitterService.tweetAt(name, infos);
    }
  });
}

function filterInput(tweetText, sender){
  var splitWords = tweetText.split(" "),
    splitChars = tweetText.split("");

  if (splitWords.length == 4 && splitChars[0] == "@"){
    return {
      name: sender,
      coin: splitWords[1],
      frequency: splitWords[2],
      currency: splitWords[3].toUpperCase()
    }
  } else {
    //TODO
    return null;
  }
}

function getCurrencySign(isoCurrency){
  var iso = isoCurrency.toUpperCase();
  switch(iso){
    case "USD":
      return "$"
    case "EUR":
      return "€";
    case "AUD":
      return "A$";
    case "BRL":
      return "R$";
    case "CAD":
      return "C$";
    case "CHF":
      return "CHF";
    case "CLP":
      return "$"
    case "CNY":
      return "¥";
    case "CZK":
      return "Kč";
    case "DKK":
      return "kr";
    case "GBP":
      return "£";
    case "HKD":
      return "$"
    case "HUF":
      return "Ft";
    case "IDR":
      return "Rp";
    case "ILS":
      return "₪";
    case "INR":
      return "₹";
    case "JPY":
      return "¥";
    case "KRW":
      return "₩";
    case "MXN":
      return "$"
    case "MYR":
      return "RM";
    case "NOK":
      return "kr";
    case "NZD":
      return "$"
    case ";PHP":
      return "₱";
    case "PKR":
      return "₨";
    case "PLN":
      return "zł";
    case "RUB":
      return "₽";
    case "SEK":
      return "kr";
    case "SGD":
      return "$"
    case ";THB":
      return "฿";
    case "TRY":
      return "₺";
    case "TWD":
      return "NT$";
    case "ZAR":
      return "R";
  }
}

function getTrendArrow(value){
  var floatValue = parseFloat(value);

  if(floatValue >= 0){
    return emojis.arrow_up;
  } else {
    return emojis.arrow_down
  }
}

//////////////////
//HELPER FUNCTIONS
//////////////////
function rand(min, max){
  return min > max ? Math.floor(Math.random()*(max-min+1)+min) : Math.floor(Math.random()*(min-max+1)+max);
}
//////////////////
//CORE FUNCTIONS
//////////////////
function onFollow(e){
  setTimeout(function(){
    //Event also triggers when we follow someone
    if(e.source.name != myName) {

      console.log(e.source.name + " followed you");
    } else {
      console.log("You are now following " + e.target.screen_name);
    }
  }, 3*seconds);
}

function onReply(e){
  console.log("You got a reply from: @" + e.source.screen_name);
  console.log("It reads: " + e.source.text);
}

//sina ist cool;
