/*__________________________________________________
|                VieraRemote v2.2                   |
|                                                   |
| Author : Phil Bri (12/2014)                       |
|    (See http://encausse.wordpress.com/s-a-r-a-h/) |
| Description :                                     |
|    Panasonic VIErA TV Plugin for SARAH project    |
|___________________________________________________|
*/

exports.init = function ( SARAH ) {
	var config = SARAH.ConfigManager.getConfig();

	if ( /^autodetect$/i.test( config.modules.vieraremote.Viera_IP ) == false ) return console.log('VieraRemote => Autodetect [OFF]');

	// Configure ip autodetection : (Auto Detect Plugin)
	if ( ! SARAH.context.vieraremote ) {
		fsearch();

		SARAH.listen ( 'autodetect', function ( data ) {
			if ( data.from != 'VieraRemote' ) fsearch();
			else {

				if ( SARAH.context.vieraremote.ip ) console.log ( '\r\nVieraRemote => Autodetect [ON] : ip = ' + SARAH.context.vieraremote.ip);
				else console.log ( '\r\nVieraRemote => Autodetect [ON] : ip non trouvée !' );
				SARAH.context.flag = false;
			}
		});
	}

	function fsearch () {
		if ( SARAH.context.flag != true ) {
			SARAH.context.flag = true;

			findViera = require ( './lib/findviera' ) ( 'Panasonic', 'DTV', function ( RetIP ) {
				SARAH.context.vieraremote = { 'ip' : RetIP };
				SARAH.trigger ( 'autodetect', { 'from' : 'VieraRemote' });
			});
		}
	}
}

exports.action = function ( data , callback , config , SARAH ) {

	var	myReg = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/,
		keyArray = data.key.split ( ',' ),
		VieraIP;
	
    if ( typeof(SARAH.context.vieraremote) != 'undefined' ) VieraIP = SARAH.context.vieraremote.ip
    else if ( myReg.test( config.modules.vieraremote.Viera_IP ) == true ) VieraIP = config.modules.vieraremote.Viera_IP
    else return callback ({ 'tts' : 'T V Viera non trouvée' })

	sendViera ( keyArray );

	function sendViera ( TvCmd ) {

		// making Viera command
		var cmdViera = keyArray.shift();
		switch ( cmdViera.substr(0,3) ) {
			case "NRC" :
				var TvCode		= '<X_KeyEvent>' + cmdViera + '</X_KeyEvent>';
				var TvAction	= 'X_SendKey';
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
				var TvAction	= cmdViera;
				var	TvUrl		= '/dmr/control_0';
				var TvUrn		= 'schemas-upnp-org:service:RenderingControl:1#';
				break;
			default :
				callback ({ 'tts': 'Erreur dans le fichier X M L' });
				break;
		}

		// Making xml body
		var body  = '<?xml version="1.0" encoding="utf-8"?>'
			body += '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">'
			body +=		'<s:Body>'
			body +=			'<u:'+ TvAction +' xmlns:u="urn:' + TvUrn + '">' + TvCode + '</u:'+ TvAction +">"
			body +=		'</s:Body>'
			body +=	'</s:Envelope>\n\r';

		// Sending SOAP request
		var request = require ('request' );

		request ({	uri	    : 	'http://' + VieraIP + ':55000' + TvUrl,
					method  : 	'POST',
					headers : {	'Content-length' :   body.length,
								'Content-type'	 :   'text/xml; charset="utf-8"',
								'SOAPACTION'	 :   '"urn:' + TvUrn + TvAction +'"' },
					body	: 	body 

		}, function ( error , response , body ) {
				if ( ! error && response.statusCode == 200 ) {
	   				if ( data.key != undefined ) {
    					var regex = /<CurrentVolume>(\d*)<\/CurrentVolume>/gm;
						var match = regex.exec ( body );
						
						if (  match ) {
							var volume = match[1].toString();
							console.log ( "\r\nVieraRemote => Volume actuel = " + volume + ' %\r\n' );
							callback ({ 'tts': 'Le volume actuel est de' + volume + ' %' });
						} else callback ({ 'tts': data.ttsAction });
						
						if ( keyArray.length ) {
							sendViera ( keyArray );
						}
    				}
   					console.log ( '\r\nVieraRemote => Commande : "' + cmdViera + '" = OK \r\n' );

   				} else callback ({ 'tts': "L'action a échouée" });
			}
		);
	}
}
