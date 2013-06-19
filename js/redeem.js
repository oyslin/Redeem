var backgroundWindow = chrome.extension.getBackgroundPage(),
    redeemQueueInfo = backgroundWindow.redeemQueueInfo;

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
    if(request.event == 'show_redeem_queue_info'){
        showRedeemQueueInfo();
    }else if(request.event == 'remove_dedeem_node'){
        removeRedeemNode(request.dealID);
    }else if(request.event == 'print_log'){
        console.log(request.type + ' data = ', request.data);
    }
});

jQuery(document).ready(function(){
    jQuery('.redeem-btn').click(function(){
        getdealIDs();
    });
    jQuery(document).on('click', '.cancel-redeem-btn', function(e){
        var $this = jQuery(this);
        var dealId = $this.attr('cancelId');
        removeRedeemNode(dealId, true);
    });
    showRedeemQueueInfo();
});

function removeRedeemNode(dealId, manually){
    redeemQueueInfo = backgroundWindow.redeemQueueInfo;
    jQuery('[dealId="' + dealId + '"]').remove();
    if(manually){
        backgroundWindow.clearTimeout(redeemQueueInfo[dealId].timeoutHandler);
        delete redeemQueueInfo[dealId];
    }
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
    var status = redeemInfo.requested ? (redeemInfo.status ? '秒杀成功' : '秒杀失败') : '未开始';
    var redeemStr = '<div class="row-fluid" dealId="' + redeemInfo.dealID + '">'
                +       '<div class="span3 image-holder">'
                +           '<div class="image-node">'
                +               '<image src="' + redeemInfo.imageUrl + '" class="redeem-image"/>'
                +           '</div> '
                +       '</div>'
                +       '<div class="span9 redeem-detail">'
                +           '<span class="redeem-title">' + redeemInfo.title + '</span>'
                +           '<span>'
                +               '<span>状态：'+ status +'</span>'
                +               '<span class="order-time-offset">误差：'+ redeemInfo.orderTimeOffset +'毫秒</span>'
                +           '</span>'
                +           '<span class="redeem-cancel-line">'
                +               '<span class="total-numer">总数： ' + redeemInfo.totalAvailable + '</span>'
                +               '<span>开始时间：' + startTime + '</span>'
                +               '<button class="btn btn-primary btn-mini cancel-redeem-btn" type="button" cancelId="' + redeemInfo.dealID + '">取消秒杀</button>'
                +           '</span>'
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
