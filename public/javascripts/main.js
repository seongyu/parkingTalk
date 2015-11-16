/**
 * Created by LeonKim on 15. 10. 30..
 */
var park_id = '01100aok151020';


angular.module('sctDashModule', ['chart.js'])
    .config(['ChartJsProvider', function (ChartJsProvider) {
        // Configure all charts
        ChartJsProvider.setOptions({
            colours: ['#3F8CFF', '#FD9943', '#FD4343']
        });
        // Configure all line charts
        ChartJsProvider.setOptions('Line', {
            datasetFill: false
        });
    }])
    .factory('request',function($http){
        var request = {};
        request.post = function(url,param,fn){
            var xsrf = $.param(param);
            $http({
                url: url,
                method: "post",
                data: xsrf,
                headers: {'Content-Type': 'application/x-www-form-urlencoded'}
            }).then(function(rtn){
                fn(rtn);
            }, function(err){
                fn('error : '+err);
            });
        };

        request.refreshInfo = function(park_id,fn){
            request.post(api_url+'getPark',{"park_id":park_id},function(res){
                var rs = res.data;
                if(rs.status==='OK'){
                    rs.data.update_info = formatDate(new Date(rs.data.update_info)-9*3600*1000);
                    fn(rs.data);
                }
            });
        };

        request.remove = function(url,param,fn){
            var xsrf = $.param(param);
            $http({
                url: url,
                method: "delete",
                data: xsrf,
                headers: {'Content-Type': 'application/x-www-form-urlencoded'}
            }).then(function(rtn){
                fn(rtn);
            }, function(err){
                fn('error : '+err);
            });
        };

        request.get = function(url,param,fn){
            $http.get(url,param).then(function(rtn){
                fn(rtn);
            }, function(err){
                fn(err);
            });
        };
        // factory function body that constructs shinyNewServiceInstance
        return request;
    })
    .directive('loading', function () {
        return {
            restrict: 'E',
            replace:true,
            template: '<div class="loading"><div class="table_center"><img src="http://www.nasa.gov/multimedia/videogallery/ajax-loader.gif" width="50" height="50" /></div></div>',
            link: function (scope, element, attr) {
                scope.$watch('loading', function (val) {
                    if (val)
                        scope.loadingStatus = 'true';
                    else
                        scope.loadingStatus = 'false';
                });
            }
        }
    })
    .controller('mainCtrl', function ($scope, request) {

        $scope.park_info = parkList[0];

        $scope.checkStatus = function(){
            $scope.loadingStatus = 'table';
            request.refreshInfo(park_id,function(res){
                $scope.park_info = res;
                $scope.status = mk_dateInfo(res.time_info);
                request.post(api_url+'getSites',{
                    park_id : res.park_id
                },function(res2){
                    var siteStatus = res2.data.data;
                    var av = [];
                    siteStatus.forEach(function(v,i,a){
                        if(v.status==='N'){
                            v.time_chk = duringTimeChk(v.stat_time);
                            v.stat_time = new Date(v.stat_time).toLocaleTimeString();
                            av.push(v);
                        }

                        if(i=== a.length-1){
                            $scope.siteStatus = av;
                            $scope.loadingStatus = 'none';
                            $scope.setMap(a);
                        }
                    });
                    $scope.resReq(park_id);
                    $('#sidebar').height($('.box_cnt').height());
                });
            });
        };

        $scope.checkStatus();

        $scope.resReq = function(park){
            request.post(api_url+'getResList',{
                park_id : park,
                req_dt:new Date().toJSON()
            },function(res){
                var data = res.data.data;
                if(data.length>0){
                    data.forEach(function(v,i,a){
                        a[i].in_txt = formatDate(v.in);
                        a[i].out_txt = formatDate(v.out);
                        $scope.resStatus = data;

                        if(i=== a.length-1){
                            $scope.resStatus = a;
                        }
                    })
                }
            });
        };

        $scope.site_info = site_info;

        $scope.testbtn = function(){
            var id = $('#testsa').val();
            //45버6357
            var param = {
                park_id : park_id,
                'car_info.car_num' : id
            };

            request.post(api_url+'getSites',param,function(res){
                var rtn = res.data.data[0];
                rtn.in_txt = formatDate(rtn.stat_time);
                rtn.during_txt = duringTimeChk(rtn.stat_time);
                rtn.update_txt = formatDate(new Date());
                $scope.targetSite =rtn;
                console.log($scope.targetSite);
                $('#siteInfoModal').modal('show');
            });
        };


        $scope.setMap = function (site_list) {
            site_info.m.forEach(function (v, i, a) {
                var targetm = '.td:eq(' + v + ')';
                $(targetm).css('visibility', 'hidden');
            });

            site_info.a.forEach(function (v, i, a) {
                if(site_list[i].status==='Y'){
                    var targetm = '.td:eq('+v+') div';

                    if($scope.target){
                        var cl = '#FFA700';
                        if(site_list[i].site_code===$scope.target){
                            cl = '#51b9ff';
                        }
                        $(targetm).css('background-color',cl).html(
                            '<div class="table_display"><p style="font-size: 12px;" class="table_cell_center">'+site_list[i].site_code+'<br>'+site_list[i].car_info.car_num+'</p></div>'
                        );

                    }else{
                        $(targetm).css('background-color','#51b9ff').html(
                            '<div class="table_display"><p style="font-size: 12px;" class="table_cell_center">'+site_list[i].site_code+'<br>'+site_list[i].car_info.car_num+'</p></div>'
                        );

                    }
                }else{
                    var targetm = '.td:eq('+v+') div';

                    $(targetm).css('background-color','#FF8585').html(
                        '<div class="table_display"><p style="font-size: 12px;" class="table_cell_center">'+site_list[i].site_code+'<br>'+site_list[i].car_info.car_num+'</p></div>'
                    );
                }
            });

            $('#siteView').css('visibility', 'visible');

            $('#sidebar').height($('#sidebar').parent().height());
        };

        gridster = $(".gridster ul").gridster({
            widget_base_dimensions: [100, 100],
            widget_margins: [5, 5],
            resize: {
                enabled: true,
                start: function (e, ui, widget) {
                    //parentWidth = jQuery(widget).width();
                    //parentHeight = jQuery(widget).height();
                    jQuery(widget).find("iframe").css("display", "none");
                },
                stop: function (e, ui, widget) {
                    //alert(jQuery(widget).html());
                    jQuery(widget).find("iframe").css("display", "");
                    parentWidth = jQuery(widget).width();
                    parentHeight = jQuery(widget).height();
                    //jQuery(widget).find("iframe").css("width", parentWidth-10);
                    //jQuery(widget).find("iframe").css("height", parentHeight-35);
                },
                min_size: [1, 1]
            },
            autogrow_cols: true,
            max_size_x: 20
        }).data('gridster');

        var mk_dateInfo = function(time_info){
            var i = 'holiday';
            var d = new Date();
            if(d.getDay()===0|| d.getDay()===6){
                i = 'weekend';
            }
            //else if(d.getDay()===6){
            //
            //}
            else{
                i = 'weekday';

            }
            var tpl = '오늘 운영시간 '+
                    time_info[i].start.substring(0,2)+':'+time_info[i].start.substring(2)
                    +' ~ '+
                    time_info[i].end.substring(0,2)+':'+time_info[i].end.substring(2);
            return tpl;
        };

        $scope.isS0 = 'Y'; //그리드 on/off

        $scope.test = function (i, act) {
            if (act == 'in') {
                $('li:eq(' + i + ') .box_cnt').fadeIn();
                $scope.isS0 = 'Y';
            } else {
                $('li:eq(' + i + ') .box_cnt').fadeOut();
                $scope.isS0 = 'N';
            }
        };

        $scope.labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Dec"];
        $scope.series = ['H', 'M', 'L'];
        $scope.option = {};
        $scope.data = [
            [200, 190, 210, 208, 195, 178, 185, 177, 175, 168, 155, 90],
            [155, 167, 166, 176, 173, 158, 155, 153, 146, 136, 122, 85],
            [127, 125, 133, 131, 126, 122, 124, 114, 105, 101, 92, 71]
        ];




    });

function duringTimeChk(stat_time){
    var s = parseInt((new Date()-new Date(stat_time))/1000);
    var hh,mm,ss;
    hh = parseInt(s/60/60); // 시간
    mm = parseInt(s/60-hh*60); // 분
    ss = s-hh*60*60-mm*60;

    return hh+'시간 '+mm+'분 '+ss+'초';
};

function crtlWnH() {
    //각 컨텐츠 박스 Contents 높이
    //common.js에 지정하면 .boxBs값을 가져오지 못 한 상태에서 각 위젯 컨텐츠 박스를 생성하여, 정상적인 높이로 만들어지지 않음
    //본 함수때문인지는 몰라도 초기에 뿌려진 위젯 컨텐츠 박스 높이 이하로 줄여지지 않음
    //UX플랫폼 개발진에 문의할 것
    $(".box_cnt").each(function(){

        $(this).css({'height':( $(this).parents(".boxBs").height() - 42 ) + 'px'});
        //$(this).css({'height': '200px'});
    });
}

function formatDate(date_str_or_num){
    var d = new Date(date_str_or_num);
    var daySet = d.toLocaleDateString().split('.');
    var timeSet = d.toLocaleTimeString().split(":");
    var msg = daySet[1]+'월 '+daySet[2]+'일 '+ timeSet[0]+'시 '+timeSet[1]+'분';
    return msg;
}


var testbtn = function(){
    $('#parkInfoModal').modal('show');
};

var tabClk = function(id){
    console.log(id);
    $('.tab-pane').hide();
    $('#'+id).show();
};