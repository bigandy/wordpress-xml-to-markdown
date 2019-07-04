"use strict";

const fs = require("fs");
const xml2js = require("xml2js");
const TurndownService = require("turndown");
var moment = require("moment");

var tds = new TurndownService();

var inputFile = process.argv[2];
var outputDir = process.argv[3];

if (fs.existsSync(outputDir)) {
	console.log(
		`WARNING: Given output directory "${outputDir}" already exists. Files will be overwritten.`
	);
} else {
	fs.mkdirSync(outputDir);
}

wordpressImport(inputFile, outputDir);

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

			var posts = [];

			// try {
			posts = result.rss.channel[0].item;

			// posts.length = 1; // Get only one post -- useful for testing!

			posts = posts.filter(function(post) {
				var status = "";
				if (post["wp:status"]) {
					status = post["wp:status"].join("");
				}
				// console.log(post["wp:status"].join(''));
				return status != "private" && status != "inherit";
			});

			// console.log(`Post count: ${posts.length}`);

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
			var description = "";

			posts.forEach(function(post) {
				var postMap = {};

				title = post.title[0];

				title = title.replace(/'/g, "''");

				published = post["wp:post_date_gmt"];
				comments = post["wp:comment"];
				fname = post["wp:post_name"];
				markdown = "";

				// console.log(`\n\n\n\ntitle: '${title}'`);
				// console.log(`published: '${published}'`);

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

				if (post["content:encoded"]) {
					content = "<div>" + post["content:encoded"] + "</div>"; //to resolve error if plain text returned
					markdown = tds.turndown(content);

					description = tds.turndown(
						"<div>" + post["excerpt:encoded"] + "</div>"
					);

					var tagString = "";

					if (tags.length) {
						const tagsString = tags.map(tag => `'${tag}'`).join(",");
						tagString = `tags: [${tagsString}]\n`;
					}

					// console.log(tagString);

					fileHeader = `---\ntitle: '${title}'\ndate: ${published}\ndraft: false\ndescription: "${description}"\n${tagString}---\n`;
					fileContent = `${fileHeader}\n${markdown}`;
					pmap.header = `${fileHeader}\n`;

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
