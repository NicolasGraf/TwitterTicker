var emojis = require("./emojis");

function randomNumberBetween(min, max){
  return min > max ? Math.floor(Math.random()*(max-min+1)+min) : Math.floor(Math.random()*(min-max+1)+max);
}

function getTrendArrow(value){
  var floatValue = parseFloat(value);

  if(floatValue >= 0){
    return emojis.arrow_up;
  } else {
    return emojis.arrow_down
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

module.exports = {
  randomNumberBetween: randomNumberBetween,
  getTrendArrow: getTrendArrow,
  getCurrencySign: getCurrencySign,
  filterInput: filterInput
}
