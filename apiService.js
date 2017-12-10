var config = require('./config'),
  https = require('https'),
  path = config.apiPath;

function getTickerData(limit, start, convert, currency, callback){
  var params = {
    limit: limit ? "limit=" + limit : "",
    start: start ? "&start=" + start : "",
    convert: convert ? "&convert=" + convert : "",
    currency: null,
  }

  if(currency){
    params.limit = "";
    params.start = "";
    params.currency = "/" + currency;
  } else {
    params.currency = "";
  }

  var path = "ticker".concat(params.currency, "/?", params.limit, params.start, params.convert);
  console.log(path);
  getData(path, callback);
}

function getGlobalData(convert, callback){
  var params = {
    convert: convert ? "convert=" + convert : ""
  }

  var path = "global/?".concat(params.convert);
  getData(path, callback);
}

function getData(parameters, callback){
  https.get(path.concat(parameters), function(res){
    var data = '',
      fullData = [];

    res.on('data', function(response){
      data += response;
    });

    res.on('end', function(){
      fullData = JSON.parse(data);
      callback(fullData);
    });
  })
}

module.exports = {
  getTickerData: getTickerData,
  getGlobalData: getGlobalData
}
