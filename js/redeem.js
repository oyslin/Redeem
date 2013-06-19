var backgroundWindow = chrome.extension.getBackgroundPage(),
    redeemQueueInfo = backgroundWindow.redeemQueueInfo;

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
    if(request.event == 'show_redeem_queue_info'){
        showRedeemQueueInfo();
    }else if(request.event == 'update_dedeem_info'){
        updateRedeemInfo(request.dealID);
    }else if(request.event == 'print_log'){
        console.log(request.type + ' data = ', request.data);
    }
});

jQuery(document).ready(function(){
    jQuery('.redeem-btn').click(function(){
        getdealIDs();
    });
    jQuery(document).on('click', '.remove-redeem-btn', function(e){
        var $this = jQuery(this);
        var dealId = $this.attr('cancelId');
        removeRedeemInfo(dealId);
    });
    jQuery('.time-offset-input').change(function(){
        backgroundWindow.timeAhead = this.value;
    }).val(backgroundWindow.timeAhead);
    showRedeemQueueInfo();
});

function removeRedeemInfo(dealId){
//    redeemQueueInfo = backgroundWindow.redeemQueueInfo;
    jQuery('[dealId="' + dealId + '"]').remove();
    backgroundWindow.clearTimeout(redeemQueueInfo[dealId].timeoutHandler);
    delete redeemQueueInfo[dealId];
}

function updateRedeemInfo(dealId){
//    redeemQueueInfo = backgroundWindow.redeemQueueInfo;
    var dealInfoNode = jQuery('div[dealId="' + dealId + '"]');
    var redeemInfo = redeemQueueInfo[dealId];
    var status = redeemInfo.requested ? (redeemInfo.redeemed ? '秒杀成功' : '秒杀失败') : '未开始';
    var removeBtnText = redeemInfo.requested ? '删除' : '取消秒杀';
    redeemInfo.requested ? dealInfoNode.toggleClass('requested', true) : dealInfoNode.toggleClass('requested', false);
    jQuery('.redeem-status', dealInfoNode).text('状态：'+ status);
    jQuery('.remove-redeem-btn', dealInfoNode).text(removeBtnText);
    jQuery('.redeem-time-offset', dealInfoNode).text('误差：'+ redeemInfo.orderTimeOffset +'毫秒');
//    jQuery('[dealId="' + dealId + '"]').remove();
//    if(manually){
//        backgroundWindow.clearTimeout(redeemQueueInfo[dealId].timeoutHandler);
//        delete redeemQueueInfo[dealId];
//    }
}

function showRedeemQueueInfo(){
    var redeemInfo, redeemInfoHtml,
        redeemList = jQuery('.redeem-list');
    redeemQueueInfo = backgroundWindow.redeemQueueInfo;
    for(var dealId in redeemQueueInfo){
        if(jQuery('[dealId="' + dealId + '"]', redeemList).length == 0){
            redeemInfo = redeemQueueInfo[dealId];
            redeemInfoHtml = getSingleRedeemHtml(redeemInfo);
            redeemList.append(redeemInfoHtml);
        }
    }
}

function getSingleRedeemHtml(redeemInfo){
    var startTime = getStartTime(redeemInfo.startTime);
    var status = redeemInfo.requested ? (redeemInfo.redeemed ? '秒杀成功' : '秒杀失败') : '未开始';
    var requestClass = redeemInfo.requested ? "requested" : "";
    var removeBtnText = redeemInfo.requested ? '删除' : '取消秒杀';
    var redeemStr = '<div class="row-fluid ' + requestClass + '" dealId="' + redeemInfo.dealID + '">'
                +       '<div class="span3 image-holder">'
                +           '<div class="image-node">'
                +               '<image src="' + redeemInfo.imageUrl + '" class="redeem-image"/>'
                +           '</div> '
                +       '</div>'
                +       '<div class="span9 redeem-detail">'
                +           '<div class="redeem-title">' + redeemInfo.title + '</div>'
                +           '<div>'
                +               '<span class="redeem-status">状态：'+ status +'</span>'
                +               '<span class="redeem-time-offset">误差：'+ redeemInfo.orderTimeOffset +'毫秒</span>'
                +           '</div>'
                +           '<div class="redeem-cancel-line">'
                +               '<span class="total-numer">总数： ' + redeemInfo.totalAvailable + '</span>'
                +               '<span>开始时间：' + startTime + '</span>'
                +               '<button class="btn btn-mini remove-redeem-btn" type="button" cancelId="' + redeemInfo.dealID + '">' + removeBtnText + '</button>'
                +           '</div>'
                +       '</div>'
                +    '</div>'
                +    '<hr dealId="' + redeemInfo.dealID + '">';
    return redeemStr;
}

function getStartTime(startTime){
    if(startTime){
        var date = new Date(startTime),
            minutes = date.getMinutes();

        return date.getHours() + ':' + (minutes < 10 ? '0' + minutes : minutes);
    }
    return '';
}

function getdealIDs(){
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        var tabId = tabs[0].id;
        chrome.tabs.sendMessage(tabId, {event: "get_dealIDs"});
    });
}
