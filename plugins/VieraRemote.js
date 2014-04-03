/*_________________________________________________ 
| vieraremote V 0.9                                |
| Plugin pour S.A.R.A.H.                           |
| (by Phil Bri 04/2014)                            |
|__________________________________________________|
*/

exports.action = function(data,callback,config,SARAH){

	cfg=config.modules.vieraremote;
	if(!cfg.vieraip){
		console.log('Missing TV IP in rxvremote.prop !');
		callback({'tts': 'Adresse I P absente'});
		return;
	}
	TvIp = cfg.vieraip;
	// init
	var reponse  = false;
	var keyArray = data.key.split(',');
	var	TvUrl    = '/dmr/control_0';
	var TvUrn    = 'schemas-upnp-org:service:RenderingControl:1#';
	//  Data to send -- config Values
	var i = 0;
	while (i <= keyArray.length-1) {
		console.log ('\r\nCmd : '+keyArray[i])
		switch (keyArray[i].toString().substr(0,3)) {
			case "NRC" :
				TvCode   = '<X_KeyEvent>' + keyArray[i] + '</X_KeyEvent>'; 	// TvKeyCode
				TvAction = 'X_SendKey'; 									// TvAction
				TvUrl    = '/nrc/control_0'; 								// TvUrl
				TvUrn    = 'panasonic-com:service:p00NetworkControl:1#'; 	// TvUrn
				break;
			case "Set" :
				TvCode   = '<InstanceID>0</InstanceID><Channel>Master</Channel><DesiredVolume>'+ data.volume.toString() + '</DesiredVolume>';
				TvAction = data.key;
				break;
			case "Get" :
				TvCode  = '<InstanceID>0</InstanceID><Channel>Master</Channel>';
				TvAction = data.key;
				break;
			default :
				callback({'tts': 'Erreur dans le fichier X M L'});
				break;
		}
		setTimeout(sendViera(TvCode , TvAction, TvUrl, TvUrn,function(clbk){

			if (clbk){  // Case "get"
   				var regex = /<CurrentVolume>(\d*)<\/CurrentVolume>/gm;
				var match = regex.exec(clbk);
				if (match !== null) {
					var volume = match[1];
					callback ({'tts':'Le volume actuel est de ' + volume.toString() + '%'});
				}else{
					callback ({'tts': data.ttsAction});
				}
			}
		}),1000);
		i++;
	}

	function wait1s(response) {
		console.log ('waiting 1s...\r');
		//i++;
		setTimeout(function() { 0; }, 1000);	
	}

	function sendViera(TvCode , TvAction, TvUrl, TvUrn, cb) {
		// Making xml body
		//var body  = false;
		var body  = '<?xml version="1.0" encoding="utf-8"?>\n'
			body += '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">\n'
			body += 	'<s:Body>\n'
			body += 		'<u:'+ TvAction +' xmlns:u="urn:' + TvUrn + '">\n'
			body +=				TvCode + '\n'
			body += 		'</u:'+ TvAction +'>\n'
			body += 	'</s:Body>\n'
			body += '</s:Envelope>\n';

		var request = require ('request');
		request ({
			uri	    : 'http://'+TvIp+':55000'+TvUrl,
			method  : 'POST',
			headers :
			{
				'Content-length':   body.length,
				'Content-type'	:   'text/xml; charset="utf-8"',
				'SOAPACTION'	:   '"urn:' + TvUrn + TvAction +'"'
			},
			body	: body
		}, function (err, response, body) {

	    	if (err || response.statusCode != 200) {
     			callback ({'tts': "L'action a échouée"});
   			} else {
   				console.log ('Commande => OK \r\n');
   				reponse = true;
				cb (body);
			}
		});
	}
}