var bistroparser = function(mensa){
	var parser = require('./parser');
	var request = require('request');

	// process the html data and find the data we are interested in
	request(mensa.url, function(error, response, html) {
		// moment library for date conversion
		var moment = require("moment");
		// cheerio library for html parsing
		var cheerio = require('cheerio');
		// html element id list for parsing & extracting data
		var idList = [ "montag", "dienstag", "mittwoch", "donnerstag", "freitag" ];

		// check if request was successfull (html response code 200)
		if(!error && response.statusCode === 200) {
			var $ = cheerio.load(html, { normalizeWhitespace: true });
			var contentElement = $("table.contentpaneopen");

			// Preise abfragen
			// Ergebnisse in Variable preise: 
			// preise[0] (Menü 1 Student), 
			// preise[1] (Menü 1 Sonst.), 
			// preise[2] (Menü 2 Student), 
			// preise[3] (Menü 2 Sonst.), 
			// preise[4] (Eintopf Student),
			// preise[5] (Eintopf Sonst.)
			var preiseMatch = contentElement.text().match(/Stud\. (\d,\d\d) €\/Bediens?t\.? (\d,\d\d) €\/Gäste (\d,\d\d) €/g);
			var preisePartials = [];
			var preise = [];
			preiseMatch.forEach(function(el, index, array){
				var parts = el.match(/Stud\. (\d,\d\d) €\/Bediens?t\.? (\d,\d\d) €\/Gäste (\d,\d\d) €/);
				preisePartials.push(parts[1]);
				preisePartials.push(parts[3]);
			});
			preise[0] = preisePartials[0];
			preise[1] = preisePartials[1];
			preise[2] = preisePartials[0];
			preise[3] = preisePartials[1];
			preise[4] = preisePartials[2];
			preise[5] = preisePartials[3];
			//console.log("Preise: ", preisePartials, preise);

			// Tägliche Menüs
			var weekdayTables = contentElement.text().split(/((Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag) [0-9]+\.[0-9]+\.[0-9]+)/);

			// contentElement.text().split() produziert ein Array, welches 3x die Länge
			// der Wochentage hat, also 3x 6 Tage = 18 Einträge
			// deshalb hier wieder geteilt durch 3
			for(var i=1; i<= weekdayTables.length/3 ; i++){
				var dateToday = weekdayTables[i*3-2].split(" ").pop(); // Teil nach " "
				var menusTodayAll = weekdayTables[i*3];

				// III, II, I in absteigender Reihenfolge
				var menusToday = menusTodayAll.split(/Menü II|Menü I|Eintopf/, 4)
					.filter(function(el){
						// leere Elemente rausfiltern
						return el.trim().length!=0;
					});

				// Ergebnis ist ein Array mit 3 oder 4 Einträgen:
				// Menü I, II, III, Eintopf (Eintopf wird nicht jeden Tag angeboten)
				//console.log( dateToday, menusToday );

				["Menü I", "Menü II", "Menü III", "Eintopf"].forEach(function(el, index, array){
					// JSON Objekt für jedes Menü
					if(menusToday[index]){ // index-Nummern stimmen mit index von menusToday & preise überein
						var fooditem = {
							"mensa": {
								"name": mensa.name,
								"uid": mensa.uid
							},
							"date": moment(dateToday, "DD.MM.YYYY").format('YYYY-MM-DD'),
							"name": menusToday[index].trim(),
							"minPrice": parseFloat( preise[index*2].replace(',','.') ).toFixed(2),
							"maxPrice": parseFloat( preise[index*2+1].replace(',','.') ).toFixed(2),
							"menuName": el,
							"closed": 0
							};

						if( (fooditem.name.toLowerCase().indexOf("geschloss") !== -1) ||
							(fooditem.name.toLowerCase().indexOf("keine ausg") !== -1)) {
							fooditem.minPrice = "0";
							fooditem.maxPrice = "0";
							fooditem.closed = 1;
						}

						if(fooditem.name.indexOf("Änderungen vorb")) {
							fooditem.name = fooditem.name.split("Änderungen vorb")[0].trim();
						}
						
						console.log("" + fooditem.date + ": " + fooditem.name + " (" + fooditem.minPrice + "/" + fooditem.maxPrice + ")");
						parser.insertData(fooditem);
					}
				});
			}
		}
	});
}
module.exports.bistroparser = bistroparser;
