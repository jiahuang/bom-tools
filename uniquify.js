var fs = require('fs'),
  csv = require('csv'),
  path = require('path')
  ;

// takes in boms and spits out all the unique components 
var Uniquify = function(files, output, excludes, keepColumns, column){
  this.column = column;
  this.files = files;
  this.excludes = excludes;
  this.output = output;
  this.data = [];
  this.extraColumns = [];
  this.keepColumns = keepColumns;
}

Uniquify.prototype._isExcluded = function(record){
  var excludeKeys = Object.keys(this.excludes);
  for (var i = 0; i < excludeKeys.length; i++){
    var key = excludeKeys[i];
    if (this.excludes[key].indexOf(record[key]) != -1){
      return true;
    }
  }

  return false;
}

Uniquify.prototype._stashOutput = function(record, filename){
  // open up the output file
  var self = this;
  if (self._isExcluded(record)) return;

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

    self.keepColumns.forEach(function(key){
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
  var csvString = "";
  var count = 0;
  var self = this;
  // stick in the base columns first, then stick in the extra columns
  csvString = self.keepColumns.join(',') +','+ self.extraColumns.join(',')+'\n';

  // then for each line populate the base information
  self.data.forEach(function(d){

    csvString = csvString + self.keepColumns.map(function(column){
      return d[column]
    }).join(',') + ',';
    
    // now populate the extra column as applicable
    csvString = csvString + self.extraColumns.map(function(column){
      if (column in d) return d[column];
      else return "";
    }).join(',') + "\n";

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
    console.log("reading in file", file);
    csv()
    .from.stream(fs.createReadStream(file), {columns: true})
    .on('record', function(record){
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

// excludes resistors, caps, and inductors
var excludes = {Type: ["CAP-0402-SEEED", "CAP_0402", "RES-0402-SEEED", "RES_0402", "CAP_0805"]};
var uniqifyColumn = "Manufacturer PN"; 
var keepColumns = ["Type", "Value", "Description", "Package", 
  "Manufacturer", "Manufacturer PN", "Datasheet", "Source", "Link", "Part #", "Notes"];

if (process.argv.length <= 3){
  return console.log("Usage: node uniquify.js output.csv bom1.csv [bom2.csv] [bom3.csv] ...");
} 

var output = process.argv[2];
var files = process.argv.splice(3, process.argv.length);

var u = new Uniquify(files, output, excludes, keepColumns, "Manufacturer PN");
u.start();

