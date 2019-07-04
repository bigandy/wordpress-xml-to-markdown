"use strict";

/***
    Usage: blog2md b|w <BLOGGER/WordPress BACKUP XML> <OUTPUT DIR>

*/

const fs = require("fs");
const os = require("os");
const path = require("path");
const xml2js = require("xml2js");
const TurndownService = require("turndown");
var moment = require("moment");

var tds = new TurndownService();

// console.log(`No. of arguments passed: ${process.argv.length}`);

if (process.argv.length < 5) {
  // ${process.argv[1]}
  console.log(`Usage: blog2md [b|w] <BACKUP XML> <OUTPUT DIR> m|s`);
  console.log(`\t b for parsing Blogger(Blogspot) backup`);
  console.log(`\t w for parsing WordPress backup`);
  return 1;
}

var option = process.argv[2];
var inputFile = process.argv[3];

var outputDir = process.argv[4];

var mergeComments = process.argv[5] == "m" ? "m" : "s";

if (fs.existsSync(outputDir)) {
  console.log(
    `WARNING: Given output directory "${outputDir}" already exists. Files will be overwritten.`
  );
} else {
  fs.mkdirSync(outputDir);
}

if (option.toLowerCase() == "b") {
  bloggerImport(inputFile, outputDir);
} else if (option.toLowerCase() == "w") {
  wordpressImport(inputFile, outputDir);
} else {
  console.log("Only b (Blogger) and w (WordPress) are valid options");
  return;
}

function wordpressImport(backupXmlFile, outputDir) {
  var parser = new xml2js.Parser();

  fs.readFile(backupXmlFile, function(err, data) {
    parser.parseString(data, function(err, result) {
      if (err) {
        console.log(
          `Error parsing xml file (${backupXmlFile})\n${JSON.stringify(err)}`
        );
        return 1;
      }
      // console.dir(result);
      // console.log(JSON.stringify(result)); return;
      var posts = [];

      // try {
      posts = result.rss.channel[0].item;

      console.log(`Total Post count: ${posts.length}`);

      posts = posts.filter(function(post) {
        var status = "";
        if (post["wp:status"]) {
          status = post["wp:status"].join("");
        }
        // console.log(post["wp:status"].join(''));
        return status != "private" && status != "inherit";
      });

      // console.log(posts)
      console.log(`Post count: ${posts.length}`);

      var title = "";
      var content = "";
      var tags = [];
      var published = "";
      var comments = [];
      var fname = "";
      var markdown = "";
      var fileContent = "";
      var fileHeader = "";
      var postMaps = {};

      console.log(posts[posts.length - 1]);
      posts.forEach(function(post) {
        // console.log(post);
        var postMap = {};

        title = post.title[0];

        // console.log(title);

        // if (title && title.indexOf("'")!=-1){
        title = title.replace(/'/g, "''");
        // }

        published = post.pubDate;
        comments = post["wp:comment"];
        fname = post["wp:post_name"];
        markdown = "";

        console.log(`\n\n\n\ntitle: '${title}'`);
        console.log(`published: '${published}'`);

        tags = [];

        var categories = post.category;

        if (categories && categories.length) {
          categories.forEach(function(category) {
            tags.push(category["_"]);
          });
        }

        var pmap = { fname: "", comments: [] };
        pmap.fname = outputDir + "/" + fname + "-comments.md";

        fname = outputDir + "/" + fname + ".md";
        pmap.postName = fname;
        console.log(`fname: '${fname}'`);

        if (post["content:encoded"]) {
          // console.log('content available');
          content = "<div>" + post["content:encoded"] + "</div>"; //to resolve error if plain text returned
          markdown = tds.turndown(content);
          // console.log(markdown);

          fileHeader = `---\ntitle: '${title}'\ndate: ${published}\ndraft: false\n${tagString}---\n`;
          fileContent = `${fileHeader}\n${markdown}`;
          pmap.header = `${fileHeader}\n`;

          // fileContent = `---\ntitle: '${title}'\ndate: ${published}\ndraft: false\n${tagString}---\n\n${markdown}`;

          writeToFile(fname, fileContent);
        }
      });
    });
  });
}

function writeToFile(filename, content, append = false) {
  if (append) {
    console.log(`DEBUG: going to append to ${filename}`);
    try {
      fs.appendFileSync(filename, content);
      console.log(`Successfully appended to ${filename}`);
    } catch (err) {
      console.log(
        `Error while appending to ${filename} - ${JSON.stringify(err)}`
      );
      console.dir(err);
    }
  } else {
    console.log(`DEBUG: going to write to ${filename}`);
    try {
      fs.writeFileSync(filename, content);
      console.log(`Successfully written to ${filename}`);
    } catch (err) {
      console.log(
        `Error while writing to ${filename} - ${JSON.stringify(err)}`
      );
      console.dir(err);
    }
  }
}
