var redeemQueueInfo = {},
    marketplaceID = "AAHKV2X7AFYLW",
    sessionID,
    timeAhead = 420;

chrome.tabs.onActivated.addListener(function(){
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        var url = tabs[0].url,
            tabId = tabs[0].id;
        updateBrowserAction(url, tabId);
    });
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
    var url = tab.url;
    updateBrowserAction(url, tabId);
});

chrome.runtime.onMessage.addListener(function(request, sender, senderResponse){
    if(request.event == 'get_dealID_success'){
        var dealIDs = request.dealIDs;
        getDealInfo(dealIDs);
    }
});

function updateBrowserAction(url, tabId){
    if(url.indexOf("%E4%BF%83%E9%94%80-%E7%89%B9%E4%BB%B7") != -1){
        chrome.browserAction.enable(tabId);
        getsessionID();
    }else{
        chrome.browserAction.disable(tabId);
    }
}

function getsessionID(){
    if(!sessionID){
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            var url = tabs[0].url;
            chrome.cookies.get({
                url: url,
                name: "session-id"
            }, function(cookie){
                sessionID = cookie.value;
            });
        });
    }
}

function getDealInfo(dealIDs){
    var needGetInfoIds = [], dealId;
    for(var i = 0; i < dealIDs.length; i++){
        dealId = dealIDs[i];
        if(dealId && (!redeemQueueInfo[dealId] || !redeemQueueInfo[dealId].hasDetail)){
            needGetInfoIds.push(dealId);
        }
    }
    if(needGetInfoIds.length > 0){
        var currentTime = Date.parse(new Date());
        var url = "http://www.amazon.cn/xa/goldbox/GetDeals?nocache=" + currentTime,
            data = '{"requestMetadata":{"marketplaceID":"' + marketplaceID
                + '"},"filter":{"__type":"DealIDDealFilter:http://internal.amazon.com/coral/com.amazon.DealService.model/","dealIDs":[' + needGetInfoIds.join(',')
                + ']},"ordering":[],"page":1,"resultsPerPage":' + needGetInfoIds.length
                + ',"includeVariations":true}';
        var postData = {
            type: "POST",
            dataType: 'json',
            data: data,
            url:url
        };
        var doneFunc = function(data){
            if(data && data.deals){
                var deals = data.deals,
                    dealInfo, asins, asin, dealID, msToStart, startTime;
                if(deals.length > 0){
                    for(var i = 0; i < deals.length; i++){
                        dealInfo = deals[i];
                        asins = dealInfo.asins;

                        dealID = dealInfo.dealID;
                        msToStart = dealInfo.status.msToStart;

                        startTime = Date.parse(new Date()) + msToStart;

                        var redeemInfo = redeemQueueInfo[dealID];
                        if(!redeemInfo){
                            redeemInfo = {
                                dealID: dealID,
                                startTime: startTime,
                                totalAvailable: dealInfo.status.totalAvailable
                            };
                            redeemQueueInfo[dealID] = redeemInfo;
                        }

                        //If currently no deal info, get deal info 5 minutes before start
                        if(!asins && !dealInfo.parentAsin || !dealInfo.detail){
                            redeemInfo.timeoutHandler = scheduleGetInfo(dealID, msToStart);
                            redeemInfo.title = dealInfo.teaser.teaser;
                            redeemInfo.imageUrl = 'images/default.gif';
                            redeemInfo.hasDetail = false;
                            redeemInfo.requested = false;
                            continue;
                        };

                        asin = dealInfo.parentAsin ? dealInfo.parentAsin : asins[0].asin;
                        redeemInfo.timeoutHandler = secheduleOrder(dealID, asin, msToStart);
//                        redeemInfo.timeoutHandler = secheduleOrder(dealID, asin, 2000);
                        redeemInfo.title = dealInfo.detail.title ? dealInfo.detail.title : dealInfo.teaser.teaser;
                        redeemInfo.imageUrl = dealInfo.detail.imageAsin ? dealInfo.detail.imageAsin : 'images/default.gif';
                        redeemInfo.hasDetail = true;
                        redeemInfo.requested = false;
                    };
                    showRedeemQueueInfo();
                }
            }
        };

        jQuery.ajax(postData).done(doneFunc).error(function(e){
        });
    };
}

function showRedeemQueueInfo(){
    chrome.runtime.sendMessage({event: 'show_redeem_queue_info'});
}

function updateRedeemInfo(dealID){
    chrome.runtime.sendMessage({event: 'update_dedeem_info', dealID: dealID});
}

function scheduleGetInfo(dealID, msToStart){
    var timeoutHandler = setTimeout(function(){
        getDealInfo(['"' + dealID + '"']);
    }, msToStart - 300000);

    return timeoutHandler;
};

function secheduleOrder(dealID, asin, toStartTime){
    var handler = setTimeout(function(){
        var currentTime = Date.parse(new Date());
        var url = 'http://www.amazon.cn/gp/deal/ajax/redeemDeal.html?'
            + 'marketplaceID=' + marketplaceID
            + '&dealID=' + dealID
            + '&asin=' + asin
            + '&sessionID=' + sessionID
            + '&ref=gbwDpLd_' + dealID + '_' + asin
            + '&nocache=' + currentTime;
        var postData = {
            type: "POST",
            data: {},
            url: url
        };
        jQuery.ajax(postData).done(function(data){
            data = JSON.parse(data);
            redeemQueueInfo[dealID].redeemed = data.redeemed;
            redeemQueueInfo[dealID].requested = true;
            redeemQueueInfo[dealID].orderTimeOffset = 0 - data.deal.status.msToStart;
            updateRedeemInfo(dealID);
        });
        setOrderTimer(postData);
    }, toStartTime - timeAhead);
    return handler;
}

function setOrderTimer(postData){
    var handler = setInterval(function(){
        jQuery.ajax(postData).done(function(data){
            data = JSON.parse(data);
            redeemQueueInfo[data.deal.dealID].redeemed = data.redeemed | redeemQueueInfo[data.deal.dealID].redeemed;
        });
    }, 50);

    setTimeout(function(){
        clearInterval(handler);
    }, 500);
}

function getSortedRedeemQueueInfo(){
    var sortedRedeemQueueInfo = [], redeemInfo;
    for(var dealID in redeemQueueInfo){
        redeemInfo = redeemQueueInfo[dealID];
        sortedRedeemQueueInfo.push(redeemInfo);
    }
    if(sortedRedeemQueueInfo.length > 0){
        sortedRedeemQueueInfo.sort(compareRedeemInfoFun);
    }
    return sortedRedeemQueueInfo;
}

function compareRedeemInfoFun(first, second){
    var result;
    result = first.startTime > second.startTime ? 1 : first.startTime == second.startTime ? 0 : -1;
    return result;
}
