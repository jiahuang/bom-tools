var fs = require('fs'),
  csv = require('csv'),
  path = require('path')
  ;
// excludes resistors, caps, and inductors
var excludes = [];
var uniqifyColumn = "Manufacturer PN"; 
var keepColumns = ["Type", "Value", "Description", "Package", 
  "Manufacturer", "Manufacturer PN", "Datasheet", "Source", "Link", "Part #", "Notes"];

// takes in boms and spits out all the unique components 
var Uniquify = function(files, output, excludes, column){
  this.column = column;
  this.files = files;
  this.excludes = excludes;
  this.output = output;
  this.data = [];
  this.extraColumns = [];
  this.start();
}

Uniquify.prototype._stashOutput = function(record, filename){
  // open up the output file
  var self = this;
  var isRepeated = this.data.some(function(e, i){
    return e[self.column] == record[self.column]
  });

  if (!isRepeated){
    var product = path.basename(filename, ".csv");
    var filtered = {};
    filtered[product] = record["Qty"];
    if (self.extraColumns.indexOf(product) == -1){
      self.extraColumns.push(product);
    }

    keepColumns.forEach(function(key){
      if (record[key] == undefined)
        filtered[key] = "";
      else {
        filtered[key] = record[key].replace(/[,\n]+/g, '');
      }
    });
    self.data.push(filtered);
  }
}

Uniquify.prototype.write = function(){
  console.log("writing");
  var csvString = "";
  var count = 0;
  var self = this;
  // stick in the base columns first
  keepColumns.forEach(function(column){
    csvString = csvString+column+",";
  });

  // then stick in the extra columns
  self.extraColumns.forEach(function(column){
    csvString = csvString+column+",";
  });

  csvString = csvString +"\n";
  console.log(csvString);
  // then for each line populate the base information
  self.data.forEach(function(d){
    keepColumns.forEach(function(column){
      csvString = csvString+d[column]+",";
    });
    
    // now populate the extra column as applicable
    self.extraColumns.forEach(function(column){
      if (column in d) {
        csvString = csvString+d[column]+",";
      } else {
        csvString = csvString+""+",";
      }
    });
    csvString = csvString + "\n";
    count++;
    if (count >= self.data.length){
      // write it to a file
      fs.writeFile(self.output, csvString , function(err){
        if (err) throw err
        console.log("Done. Saved file to", self.output);
      });
    }
  });

}

Uniquify.prototype.start = function(){
  var count = 0;
  var self = this;
  self.files.forEach(function(file){
    // console.log("file", file);
    csv()
    .from.stream(fs.createReadStream(file), {columns: true})
    .on('record', function(record){
      console.log(record);
      self._stashOutput(record, file);
    })
    .on('end', function(){
      // console.log("self.data", self.data, self.data.length);
      count++;
      if (count >= self.files.length){
        // after everything is done write all the data
        self.write();
      }
    });
  });

}

var u = new Uniquify(['./audio.csv'], 
  "uniquify.csv", [], "Manufacturer PN");