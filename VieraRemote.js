/*__________________________________________________
|              PanaBDRemote v2.0                    |
|                                                   |
| Author : Phil Bri (12/2014)                       |
|    (See http://encausse.wordpress.com/s-a-r-a-h/) |
| Description :                                     |
|    Panasonic VIErA TV Plugin for SARAH project    |
|___________________________________________________|
*/


var VieraIP;

exports.init = function ( SARAH ) {

	var findViera = require ( './lib/findUPNP.js' );

	findViera( 'Panasonic VIErA', 'DTV', function ( tvIP ) {
		if ( !tvIP ) { return console.log ( '\r\nVieraRemote => T V Viera non trouvée\r\n' ) }
		VieraIP = tvIP;
		console.log ( '\r\nVieraRemote => Viera IP = ' + VieraIP + ' (Auto Detection)\r\n');
	});
}

exports.action = function ( data , callback , config , SARAH ) {

	if ( VieraIP == undefined ) { return callback ({ 'tts' : 'T V Viera non trouvée' }) }

	var keyArray = data.key.split( ',' );
	
	sendViera ( keyArray );

	function sendViera ( TvCmd ) {

		// making Viera command
		var cmdViera = keyArray.shift();
		switch ( cmdViera.substr(0,3) ) {
			case "NRC" :
				var TvCode		= '<X_KeyEvent>' + cmdViera + '</X_KeyEvent>';
				var TvAction 	= 'X_SendKey';
				var TvUrl		= '/nrc/control_0';
				var TvUrn		= 'panasonic-com:service:p00NetworkControl:1#';
				break;
			case "Set" :
				var TvCode		= '<InstanceID>0</InstanceID><Channel>Master</Channel><DesiredVolume>'+ data.volume.toString() + '</DesiredVolume>';
				TvAction		= cmdViera;
				var	TvUrl		= '/dmr/control_0';
				var TvUrn		= 'schemas-upnp-org:service:RenderingControl:1#';
				break;
			case "Get" :
				var TvCode		= '<InstanceID>0</InstanceID><Channel>Master</Channel>';
				var TvAction 	= cmdViera;
				var	TvUrl		= '/dmr/control_0';
				var TvUrn		= 'schemas-upnp-org:service:RenderingControl:1#';
				break;
			default :
				callback({ 'tts': 'Erreur dans le fichier X M L' });
				break;
		}

		// Making xml body
		var body  = '<?xml version="1.0" encoding="utf-8"?>'
			body += '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">'
			body += 	'<s:Body>'
			body += 		'<u:'+ TvAction +' xmlns:u="urn:' + TvUrn + '">'
			body +=				TvCode
			body += 		'</u:'+ TvAction +">"
			body += 	'</s:Body>'
			body += '</s:Envelope>\n\r';

		// Sending SOAP request
		var request = require ('request' );
		request ({
			uri	    : 'http://' + VieraIP + ':55000' + TvUrl,
			method  : 'POST',
			headers :
			{
				'Content-length' :   body.length,
				'Content-type'	 :   'text/xml; charset="utf-8"',
				'SOAPACTION'	 :   '"urn:' + TvUrn + TvAction +'"'
			},
			body	: body 
		}, function ( err , response , body ) {

				if ( response.statusCode = 200 ) {
    				if ( data.key != undefined ) {
    					var regex = /<CurrentVolume>(\d*)<\/CurrentVolume>/gm;
						var match = regex.exec ( body );
						if (  match ) {
							var volume = match[1].toString();
							console.log ( "\r\nVieraRemote => Volume TV = " + volume + ' %\r\n' );
							callback ({ 'tts': 'Le volume actuel est de' + volume + ' %' });
						} else {
							callback ({ 'tts': data.ttsAction });
						}
						if ( keyArray.length ) {
							sendViera ( keyArray );
						}
    				}
   					console.log ( '\r\nVieraRemote => cmd : "' + cmdViera + '" = OK \r\n' );

   				} else {
     				callback ({ 'tts': "L'action a échouée" });
				}
			}
		);
	}
}
