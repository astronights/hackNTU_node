const mongoose = require('mongoose');
const https = require('https');
const request = require('request');
const geolib = require('geolib');
const GeoPoint = require('geopoint');
const fetch = require("node-fetch");
const http = require('http');
const gcal = require("google-calendar")
const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
module.exports = function(app, db){


          const getFares = async (json, fare_type="Adult card fare") => {
            
            const finalFare = new Promise ((resolveFinalFare, rejectFinalFare) => {
              for(let q = 0; q < json.routes[0].legs[0].steps.length; q++){
                if(json.routes[0].legs[0].steps[q].travel_mode == "TRANSIT"){
                  let temp_data = json.routes[0].legs[0].steps[q];
                  if(temp_data.html_instructions.substring(0, 6)=="Subway"){
                     let now = new Date(temp_data.transit_details.departure_time.value);
                      let h = now.getHours();
                      let m = now.getMinutes();
                    if(h < 7 && m < 45 && now.getDay()!= "Saturday" && now.getDay()!= "Sunday"){
                    return db.collection("mrt_fare").find({
                      applicable_time: "Before 7.45am  (Weekdays excluding public holidays)",
                      fare_type: fare_type, 
                      distance: {$elemMatch: {"$gt": parseInt(temp_data.distance.text.split(" ")[0]), "$lt": parseInt(temp_data.distance.text.split(" ")[0])}}},
                      function(err, user){
                        if(err){
                          console.log("Lol gg.");
                        }
                      else{
                        console.log(user);
                        resolveFinalFare(JSON.stringify(user.fare_per_ride));
                        //res.send(JSON.stringify(user.fare_per_ride));
                      }
                    });
                  }
                    else{
                  return db.collection("mrt_fare").findOne({
                    applicable_time: "All other timings", 
                    fare_type: fare_type, 
                    distance: {"$gte": parseInt(temp_data.distance.text.split(" ")[0]), "$lt": parseInt(temp_data.distance.text.split(" ")[0])}},
                    function(err, user){
                        if(err){
                          console.log("Lol gg.");
                        }
                      else{
                        console.log(user + "123");
                        console.log(user.fare_per_ride);
                        resolveFinalFare(JSON.stringify(user.fare_per_ride));
                      }
                    });
                  }
                }
                  else if(temp_data.html_instructions.substring(0, 3)=="Bus"){
                      let temp = temp_data.transit_details.line.name.replace(/\D/g, '');
                      return db.collection("bus_type").findOne({
                        Bus: parseInt(temp)
                      }, function(err, rec){
                        if(err){
                          console.log("Bus type wasn't detected yo. Wtf");
                        }
                        else{
                             if(rec.Type == 'Trunk'){
                            return db.collection('trunk_fare').findOne({
                            distance: {"$gte": parseInt(temp_data.distance.text.split(" ")[0]), "$lt": parseInt(temp_data.distance.text.split(" ")[0])}},
                              function(err, user){  
                              let code = fare_type.toLowerCase().split(" ").join("_") + "_per_ride";
                              if(code == "cash_fare_per_ride"){
                                code = "adult_" + code
                              }
                              console.log("343" + user[code]);
                              resolveFinalFare(JSON.stringify(user[code]));
                            });
                          }
                          else if(rec.Type == 'Feeder'){
                            return db.collection('feeder_fare').findOne({
                              distance: [0,0] },
                                 function(err, user){
                              let code = fare_type.toLowerCase().split(" ").join("_") + "_per_ride";
                              if(code == "cash_fare_per_ride"){
                                code = "adult_" + code
                              }
                              console.log("erwe");
                              resolveFinalFare(JSON.stringify(user[code]));
                            });
                          }
                          else if(rec.Type == 'Express'){
                            return db.collection('express_fare').findOne({
                            distance: {"$gte": parseInt(temp_data.distance.text.split(" ")[0]), "$lt": parseInt(temp_data.distance.text.split(" ")[0])}
                            }, function(err, user){
                              let code = fare_type.toLowerCase().split(" ").join("_") + "_per_ride";
                              console.log("qwerty");
                              resolveFinalFare(JSON.stringify(user[code]));
                            });
                          }
                          else{
                            console.log("What bus you using da?");
                          }
                        }
                      });
                  }
              };
          }
              
            })
            return finalFare;
            
            
              
        }
          
          
   
          app.get('/', function(request, response) {
              response.sendFile(__dirname + '/views/index.html');
            });

          app.get('/route', async (req, res) => {
            ///?accessToken&?home=fghjk&?
            const accessToken = req.query.accessToken;
            console.log(accessToken);
            const google_calendar = new gcal.GoogleCalendar(accessToken);
            const HOME = "Hall 5 NTU"; //default is _HOME_
            let start_place = HOME; //default is _HOME_
            let destination = HOME; //default is _HOME_
            let arrivalTime;
            let directions = [];

            google_calendar.events.list("primary", {
                timeMax: `2019-03-25T15:59:59Z`, //`2019-${month}-${day}`
                timeMin: `2019-03-24T16:00:00Z`
            }, function (err, calendarList) {

                calendarList.items.map(e => {


                    arrivalTime = (new Date(e.start.dateTime).getTime()) / 1000;
                    destination = e.location;
                    let detailsP = {
                        start_place,
                        destination,
                    }

                    let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${start_place.replace(/ /g, "+")}&destination=${destination.replace(/ /g, "+")}&arrival_time=${arrivalTime}&mode=transit&key=AIzaSyCkuHNW1JRQY9o-zLyCg65EuOws1vIP-RE`;
                    start_place = e.location;
                    // console.log(url);

                    directions.push(new Promise((resolve, reject) => {
                            https.get(url, (resp) => {
                                let data = '';

                                resp.on('data', (d) => {
                                    data += d;
                                });

                                resp.on('end', async () => {
                                  const fare = await getFares(JSON.parse(data))
                                  console.log('awaited fare: ', fare)
//                                   let farePromise = new Promise((resolveFare, rejectFare) => resolveFare(getFares(JSON.parse(data))))
//                                   let fareData = farePromise
//                                     .then(fare => {
                                        
//                                     })
//                                     .catch(err=>console.log(err))
                                    resolve({
                                          details: detailsP,
                                          fares: fare,
                                          data: JSON.parse(data)
                                      });
                                });

                            }).on('error', (err) => {
                                reject(err);
                            })
                        }));


                });

                Promise.all(directions)
                    .then(values => {
                        res.json(values.map(v => {
                          console.log("CHECKING")
                          console.log(v.fares)
                            return {
                                details: v.details,
                                legs: v.data.routes[0].legs[0],
                                fares: v.fares
                          }
                      }))
                  })
                  .catch(err => {
                      res.send(err)
                  })
          })
      })


  
  
  
  
  
  
    
  app.route('/places').get(function(req, res){
    db.collection('food').find({}).toArray(function(err, results){
      if(err){
        console.log("Bruh....")
      }else{
        let att = [];
        for(let i = 0; i < results.length; i++){
          let point1 = new GeoPoint(results[i].Y, results[i].X);
          console.log(parseFloat(req.query.lat), parseFloat(req.query.lon));
          let point2 = new GeoPoint(parseFloat(req.query.lat), parseFloat(req.query.lon));
          if(point1.distanceTo(point2, false) <= 1){
            att.push({type: "food", name: results[i].Name, distance: point1.distanceTo(point2, false), desc: results[i].description});
          }
        }
        db.collection('parks').find({}).toArray(function(err, results){
      if(err){
        console.log("What happened?")
      }else{
        for(let i = 0; i < results.length; i++){
          let point1 = new GeoPoint(results[i].Y, results[i].X);
          let point2 = new GeoPoint(parseFloat(req.query.lat), parseFloat(req.query.lon));
          if(point1.distanceTo(point2, false) <= 1){
            att.push({type: "park", name: results[i].Name, distance: point1.distanceTo(point2, false), desc: results[i].description});
          }
        }
        //Add here.
        db.collection('eminem').find({}).toArray(function(err, results){
        if(err){
          console.log("Haha. What a fag.");
        }else{
          for(let i = 0; i < results.length; i++){
          let point1 = new GeoPoint(results[i].Y, results[i].X);
          let point2 = new GeoPoint(parseFloat(req.query.lat), parseFloat(req.query.lon));
          if(point1.distanceTo(point2, false) <= 1){
            att.push({type: "eminem", name: results[i].Name, distance: point1.distanceTo(point2, false), desc: results[i].description});
            }
            
          }
          db.collection('libraries').find({}).toArray(function(err, results){
        if(err){
          console.log("Kya chomu hai.");
        }else{
          for(let i = 0; i < results.length; i++){
          let point1 = new GeoPoint(results[i].Y, results[i].X);
          let point2 = new GeoPoint(parseFloat(req.query.lat), parseFloat(req.query.lon));
          if(point1.distanceTo(point2, false) <= 1){
            att.push({type: "library", name: results[i].Name, distance: point1.distanceTo(point2, false), desc: results[i].description});
            }
          }
        }
      //console.log(att);
      res.send(att.sort((a,b) => a.distance > b.distance));
    });
        }
    });
      }
      });
    
      }
    });
    
  });
  
         
  //Chutiyaap begins
  app.route('/fare').get(function(req, res){
    if(req.body.type == "MRT"){
      let now = new Date(req.body.time);
      let h = now.getHours();
      let m = now.getMinutes();
      if(h < 7 && m < 45 && now.getDay()!= "Saturday" && now.getDay()!= "Sunday"){
        db.collection("mrt_fare").find({
          applicable_time: "Before 7.45am  (Weekdays excluding public holidays)",
          fare_type: req.body.fare_type, 
          distance: {$elemMatch: {"$gt": req.body.distance, "$lt": req.body.distance}}},
          function(err, user){
            if(err){
              console.log("Lol gg.");
            }
          else{
            console.log(user);
            res.send(JSON.stringify(user.fare_per_ride));
          }
        });
      }
      else{
        db.collection("mrt_fare").findOne({
          applicable_time: "All other timings", 
          fare_type: req.body.fare_type, 
          distance: {"$gte": req.body.distance, "$lt": req.body.distance}},
          function(err, user){
            if(err){
              console.log("Lol gg.");
            }
          else{
            res.send(JSON.stringify(user.fare_per_ride));
          }
        });
      }
    }
    else if(req.body.type == "bus"){
      let temp = req.body.bus.replace(/\D/g, '');
      db.collection("bus_type").findOne({
        Bus: parseInt(temp)
      }, function(err, rec){
        if(err){
          res.send("Bus type wasn't detected yo. Wtf");
        }
        else{
             if(rec.Type == 'Trunk'){
            db.collection('trunk_fare').findOne({
            distance: {"$gte": req.body.distance, "$lt": req.body.distance}},
              function(err, user){  
              let code = req.body.fare_type.toLowerCase().split(" ").join("_") + "_per_ride";
              if(code == "cash_fare_per_ride"){
                code = "adult_" + code
              }
              res.send(JSON.stringify(user[code]));
            });
          }
          else if(rec.Type == 'Feeder'){
            db.collection('feeder_fare').findOne({
              distance: [0,0] },
                 function(err, user){
              let code = req.body.fare_type.toLowerCase().split(" ").join("_") + "_per_ride";
              if(code == "cash_fare_per_ride"){
                code = "adult_" + code
              }
              res.send(JSON.stringify(user[code]));
            });
          }
          else if(rec.Type == 'Express'){
            db.collection('express_fare').findOne({
            distance: {"$gte": req.body.distance, "$lt": req.body.distance}
            }, function(err, user){
              let code = req.body.fare_type.toLowerCase().split(" ").join("_") + "_per_ride";
              res.send(JSON.stringify(user[code]));
            });
          }
          else{
            res.send("What bus you using da?");
          }
        }
      });
    }
  });

  //Chutiyaap ends
}                                             