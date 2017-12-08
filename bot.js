var Twit = require('twit'),
    config = require('./config'),
    https = require('https'),
    schedule = require('node-schedule'),
    path = require('path'),
    {Pool, Client} = require('pg'),
    twit = new Twit(config),
    userStream = twit.stream('user'),
    seconds = 1000,
    minutes = seconds * 60,
    hours = minutes * 60,
    apiPath = "https://api.coinmarketcap.com/v1/",
    apiData = [],
    introMsg = "Today's Top 5 Coins: \n\n",
    myName = "AltcoinTicker",
    cronJobs = [],
    fans = [];

var pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

pool.query('select * from ticker_jobs', (err, res) => {
  console.log(res.rows);
  var rows = res.rows;
  for(var i = 0; i < rows.length; i++){
    setCronjob(rows[i].frequency, rows[i].name, rows[i].coin_id, rows[i].currency);
  }
});

cronJobs.push(schedule.scheduleJob('0 12 * * *', getAndTweetTop5));

//sina ist cool;

userStream.on('follow', onFollow);
userStream.on('replies', onReply);
userStream.on('tweet', onTweet);

//////////////////
// TICKER FUNCTIONS
//////////////////
function getAndTweetTop5(){
  https.get(apiPath + "ticker/?limit=10", function(res){
    var data = '',
      fullData = [],
      coin;

    res.on('data', function(response){
      data += response;
    });

    res.on('end', function(){
      fullData = JSON.parse(data);

      for(var i = 0; i < fullData.length/2; i++){
        coin = fullData[i].rank + ". " + fullData[i].name + " " + fullData[i].price_usd + "$";
        apiData.push(coin);
      }
      tweet(introMsg + apiData.join("\n"));
    });
  });
}

function setCronjob(frequency, target, coin, currency){
  console.log("Set up a cron Job to tweet @" + target + " every " + frequency + " hours");

  cronJobs.push(schedule.scheduleJob('0 */' + frequency + ' * * *', function(){
    tweetAtFan(target, coin, currency);
  }));
}

function insertIntoDB(name, coin_id, currency, frequency){
  var query = "insert into ticker_jobs values('" + name + "', '" + coin_id + "', '" + currency + "', " + frequency + ")";

  console.log("Executing following Query: " + query);

  pool.query(query, (err, res) => {
    if(err){
      console.log(err);
    } else {
      console.log(res);
    }
  });
}

function onTweet(e){
  if(e.user.screen_name !== myName){

    console.log("@" + e.user.screen_name + " tweeted at you");
    console.log("The tweet reads: " + e.text);

    var params = filterInput(e.text, e.user.screen_name);
    var name = params.name,
      id = params.id,
      curr = params.currency !== undefined ? params.currency.toUpperCase() : "USD";

    if(Object.keys(params).length >= 4 && e.text.split("")[0] == "@"){
      insertIntoDB(name, id, curr, params.frequency);

      cronJobs.push(schedule.scheduleJob('0 */' + params.frequency + ' * * *', function(){
        tweetAtFan(name, id, curr);
      }));
    }
  }
}

function tweetAtFan(name, id, currency){

  curr = currency !== undefined ? currency : "USD";
  https.get(apiPath + "ticker/" + id + "/?convert=" + currency, function (res){
    var fanData = '',
      fullFanData = [];

    res.on('data', function(response){
      fanData += response;
    });

    res.on('end', function(response){
      fullFanData = JSON.parse(fanData);
      var item = fullFanData[0];
      var infos = "@" + name + "\nYour stats for " + item.name;
      if(curr.toLowerCase() !== "usd") infos += "\n\nPrice USD: " + parseFloat(item.price_usd).toFixed(2) + " $";
      infos +=  "\nPrice " + curr.toUpperCase() + ": " + parseFloat(item["price_" + curr.toLowerCase()]).toFixed(2) +
        " " + getCurrencySign(curr) +
        "\nSupply: " + item.available_supply + " " + item.symbol +
        "\n%Change(24h): " + item.percent_change_24h + "%";

      tweet(infos);
    });
    res.on('error', function(response){
      console.log("Error, response is:" + response);
    });
  });
}

function filterInput(tweetText, sender){
  var split = tweetText.split(" ");

  return {
    name: sender,
    id: split[1],
    frequency: split[2],
    currency: split[3]
  }
}

function getCurrencySign(isoCurrency){
  var iso = isoCurrency.toUpperCase();
  switch(iso){
    case "USD":
      return "$";
    case "EUR":
      return "€"
    case "AUD":
      return "A$"
    case "BRL":
      return "R$"
    case "CAD":
      return "C$"
    case "CHF":
      return "CHF"
    case "CLP":
      return "$"
    case "CNY":
      return "¥"
    case "CZK":
      return "Kč"
    case "DKK":
      return "kr";
    case "GBP":
      return "£"
    case "HKD":
      return "$"
    case "HUF":
      return "Ft"
    case "IDR":
      return "Rp"
    case "ILS":
      return "₪"
    case "INR":
      return "₹"
    case "JPY":
      return "¥"
    case "KRW":
      return "₩"
    case "MXN":
      return "$"
    case "MYR":
      return "RM"
    case "NOK":
      return "kr";
    case "NZD":
      return "$"
    case "PHP":
      return "₱"
    case "PKR":
      return "₨"
    case "PLN":
      return "zł"
    case "RUB":
      return "₽"
    case "SEK":
      return "kr"
    case "SGD":
      return "$"
    case "THB":
      return "฿"
    case "TRY":
      return "₺"
    case "TWD":
      return "NT$"
    case "ZAR":
      return "R"
  }
}

//////////////////
// BASIC FUNCTIONS
//////////////////
function tweet(text){
  var parameters = {
    status: text
  };

  console.log("Tweeting the following: " + parameters.status);
  twit.post('statuses/update', parameters, postCallback);
}

function postCallback(err, data, response){
  if(err){
    console.log("Failed with: " + err.message);
  } else {
    console.log("Success");
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
