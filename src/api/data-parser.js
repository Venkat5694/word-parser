import resource from 'resource-router-middleware';
import facets from '../models/facets';
import request from 'request';
import Promise from 'bluebird';
import countWords from 'count-words-occurrence';
import _ from 'lodash';
const apiKey = "dict.1.1.20170610T055246Z.0f11bdc42e7b693a.eefbde961e10106a4efa7d852287caa49ecc68cf";
const getWordCount = (str) => {
	return new Promise(function(resolve, reject) {
		resolve(countWords(str));
	});
}
const getDictionaryDefn = (word) => {
	return new Promise(function(resolve, reject) {

		let url = 'https://dictionary.yandex.net/api/v1/dicservice.json/lookup?key=' + apiKey + '&lang=en-ru&text='+encodeURIComponent(word.word)
		request.get(url, (error, response, body) => {
			resolve( JSON.parse(body) );
		});
	});
}
const parseURL = ({ url, id }, db) => {
	return new Promise(function(resolve, reject) {
		let top = [];
		request.get(url, (error, response, body) => {
			if (error) {
				reject(error);
			}
			let str = body;
			let chunks = [];
			while (str.length > 5000) {
				let delimeter_occurance = str.indexOf('\n', 5000);
				chunks.push( getWordCount(str.substr(0, delimeter_occurance)) );
				str = str.substr(delimeter_occurance);
			}
			if (str.length > 0) {
				chunks.push(countWords(str));
			}
			//console.log(chunks.length);
			Promise.all(chunks).then(count => {
				let final = {};
				count.forEach(data => {
					function custom(source, target) {
						return ( source || 0 ) +  ( target || 0);
					}
					_.mergeWith(final, data, custom);
				});
				let arr = [];
				//console.log(final);
				Object.keys(final).forEach(obj => {
					arr.push({
						word: obj,
						count: final[obj],
					});
				});
				arr.sort((a, b) => b.count - a.count);
				let temp = arr.slice(0, 9);
				console.log(top);
				while (temp.length) {
					var chunk_arr = temp.splice(0, 2);
					chunk_arr.map(word => {
						getDictionaryDefn(word)
						.then( defn => {
							//console.log(defn);
							if(defn && defn.def) {
								top.push(Object.assign(word, {
									pos: defn.def.pos,
									synonyms: ( defn.def.tr && defn.def.tr.syn ) ? (Object.values(defn.def.tr.syn)).join(',') : '',
								}));
							}
						});
					});
				}
				console.log(top);
			})
			resolve({ words: top });
		})
	});
};
export default ({ config, db }) => resource({

	/** Property name to store preloaded entity on `request`. */
	id : 'text',

	/** For requests with an `id`, you can auto-load the entity.
	 *  Errors terminate the request, success sets `req[id] = data`.
	 */
	load(req, id, callback) {
		let facet = facets.find( facet => facet.id===id ),
			err = facet ? null : 'Not found';
		callback(err, facet);
	},

	/** GET / - List all entities */
	index({ params }, res) {
		res.json(facets);
	},

	/** POST / - Create a new entity */
	create({ body }, res) {
		//console.log(body);
		body.id = facets.length.toString(36);
		res.send(body);
		parseURL(body, db)
		.then(word_map => {
			//console.log(facets);
			facets.push(Object.assign(body,word_map));
		})
		.catch();
	},

	/** GET /:id - Return a given entity */
	read({ facet }, res) {
		res.json(facet);
	},

});
