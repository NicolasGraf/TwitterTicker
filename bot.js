var config = require('./config'),
    twitterService = require('./twitterService'),
    apiService = require('./apiService'),
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
  getAndTweetTop5();
}

init();

//////////////////
// CORE
//////////////////
function getAndTweetTop5(){

  var introMsg = "Today's Top 5 Coins: \n\n";

  apiService.getTickerData(5, null, null, null, function(data){
    console.log(data);

    for(var i = 0; i < data.length; i++){
      coin = data[i].rank + ". " + data[i].name + " " + data[i].price_usd + "$";
      apiData.push(coin);
    }
    twitterService.tweet(introMsg + apiData.join("\n"));
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
    var name = params.name,
      id = params.id,
      curr = params.currency !== undefined ? params.currency.toUpperCase() : "USD";

    if(Object.keys(params).length >= 4 && e.text.split("")[0] == "@"){
      saveTickerJob(name, id, curr, params.frequency);
      setCronjob(params.frequency, name, id, curr);
    }
  }
}

function sendInfos(name, id, currency){

  convert = currency ? currency.toUpperCase : "USD";

  apiService.getTickerData(null, null, convert, id, function(data){
    var item = data[0];
    var infos = "Your stats for " + item.name;
    if(curr.toLowerCase() !== "usd") infos += "\n\nPrice USD: " + parseFloat(item.price_usd).toFixed(2) + " $";
    infos +=  "\nPrice " + curr.toUpperCase() + ": " + parseFloat(item["price_" + curr.toLowerCase()]).toFixed(2) +
      " " + getCurrencySign(curr) +
      "\nSupply: " + item.available_supply + " " + item.symbol +
      "\n%Change(24h): " + item.percent_change_24h + "%";

    twitterService.tweetAt(name, infos);
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
