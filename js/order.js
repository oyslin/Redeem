
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
	if(request.event == 'get_dealIDs'){
        var dealIDs = getdealIDs();
//        sendResponse(dealIDs);
        chrome.runtime.sendMessage({event: 'get_dealID_success', dealIDs: dealIDs});
	}
});

function getdealIDs(){
	var parent = jQuery('.ulResized.ldshoveler');
	var timeNode = jQuery('.dealtypecont', parent);
	var spans = jQuery('span[id]', timeNode);
	var span, id, suffix='_starts_in_timer', index, dealIDs = [];
	for(var i = 0; i < spans.length; i++){
		span=spans[i];
		span=jQuery(span);
		id=span[0].id;
		if(id){
			index=id.indexOf(suffix);
			id=id.substring(0, index);
			dealIDs.push('"' + id + '"');
		}
	}
	return dealIDs;
}