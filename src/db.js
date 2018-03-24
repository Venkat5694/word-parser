var mysql = require('mysql');

export default callback => {

	var connection = mysql.createConnection({
		host     : 'localhost',
		user     : 'root',
		password : 'password',
		database : 'word_db'
	});

	connection.connect();
	callback(connection);
	//callback();
}
