// the semi-colon before function invocation is a safety net against concatenated 
// scripts and/or other plugins which may not be closed properly.
;
(function ( $, window, document, undefined ) {

    //define some helpers
    Array.max = function( array ){
        return Math.max.apply( Math, array );
    };
    Array.min = function( array ){
        return Math.min.apply( Math, array );
    };
    Array.subset = function(array,index)
    {
        var values = [];
        for (var element in array)
        {
            values.push(array[element][index]);
        }
        return values;
    }
    Array.bounds = function(array)
    {
        var bounds = new google.maps.LatLngBounds();
        for (var element in array)
        {
            bounds.extend(new google.maps.LatLng(array[element][0],array[element][1]));
        }
        return bounds;
        
    }
    function deepCopy(p,c) {
        var c = c||{};
        for (var i in p) {
            if (typeof p[i] === 'object') {
                c[i] = (p[i].constructor === Array)?[]:{};
                deepCopy(p[i],c[i]);
            } else c[i] = p[i];
        }
        return c;
    }
    
    
    function Place(place)
    {
        $.extend(this, place);
    }
    /*Place.prototype.__defineGetter__('id', function(){
        return this._id.$id;
    });*/
    function Area(area)
    {
        $.extend(this, area);
    }
    /*Area.prototype.__defineGetter__('id', function(){
        return this._id.$id;
    });*/
    function Route(route)
    {
        $.extend(this, route);
    }
    /*Route.prototype.__defineGetter__('id', function(){
        return this._id.$id;
    });*/
    // undefined is used here as the undefined global variable in ECMAScript 3 is
    // mutable (ie. it can be changed by someone else). undefined isn't really being
    // passed in so we can ensure the value of it is truly undefined. In ES5, undefined
    // can no longer be modified.

    // window and document are passed through as local variables rather than globals
    // as this (slightly) quickens the resolution process and can be more efficiently
    // minified (especially when both are regularly referenced in your plugin).

    // Create the defaults once
    var pluginName = 'DEMap',
    plugin,
    defaults = {
        baseUrl: "http://localhost/kajak2",
        iconUrl: "http://localhost/kajak2/css/icons.png",
        data: {},
        routeLod: 11,
        debug: true,
        debugCreate: false,
        panelId: '#DEMap-panel',
        mapId: '#DEMap-map',
        autofit: true,
        slideSpeed:'fase',
        pageSize: {
            pagesize:{
                'Route':30,
                'Area':20,
                'Place':300
            }
        },
        minZoom: 12,
        scroll: {
            duration: 0,
            margin:true//,
        //offset:{top:-20}
        }
    };
    Plugin.prototype.place = {
        options:{
            list:{},
            single:{},
            edit:{}
        },
        events:{}
    };
    Plugin.prototype.area = {
        options:{
            list:{},
            single:{},
            edit:{}
        },
        events:{}
    };
    Plugin.prototype.route = {
        section:{
            options:{
                list:{},
                single:{},
                edit:{}
            },
            events:{}
        },
        options:{
            list:{},
            single:{},
            edit:{}
        },
        events:{}
    };
    // The actual plugin constructor
    function Plugin( element, options ) {
        this.element = element;
        
        // jQuery has an extend method which merges the contents of two or 
        // more objects, storing the result in the first object. The first object
        // is generally empty as we don't want to alter the default options for
        // future instances of the plugin
        this.options = $.extend( {}, defaults, options) ;

        this._defaults = defaults;
        this._name = pluginName;
        plugin = this;
        this.init();
        this.loadData(this.options.data);
    }

    Plugin.prototype.init = function () {
        // Place initialization logic here
        // You already have access to the DOM element and the options via the instance, 
        // e.g., this.element and this.options
        $(this.element).append('<div id="DEMap-map"></div><div id="DEMap-panel"></div>');
        this.container = this.element;
        this.panel = $(this.element).children(plugin.options.panelId);
        this.element = $(this.element).children(plugin.options.mapId);
        $(this.element).gmap3(
        {
            action: 'init',
            events: {
                zoom_changed: plugin.map.zoomChanged
            }
        }
        );
        $(this.element).gmap3(
        {
            action : 'tilesloaded',
            callback : function(){
                $(this).removeClass('hidden');
            }
        }
        );
        $('#DEMap-panel form.object-view input,#DEMap-panel form.object-view select,#DEMap-panel form.object-view textarea').live('change',function(){
            plugin.request.send();
        });
        $('#DEMap-panel form.object-edit').live('submit',plugin.request.sendEditForm);
        $('#DEMap-panel form.object-view').live('submit',function(){
            return false;
        });
        $('#DEMap-panel .back-button').live('click',plugin.request.back);
        plugin.area.bindEvents();
        plugin.place.bindEvents();
        plugin.route.bindEvents();
        plugin.filter.bindEvents();
    };
    Plugin.prototype.loadData = function (data)
    {
        plugin.request.start();
        $.ajax({
            url: plugin.options.baseUrl+'/js/filter',
            type: 'GET',
            dataType: 'JSON',
            cache: true,
            data: {
                type: ['Route']
            //Route: {
            //    category:'4efaf3c0b1a7882d20000000'
            //}
            },
            success: plugin.request.process
        });
    }
    Plugin.prototype.renderPanel = function(data)
    {
        $(plugin.panel).html(data);
    }
    //Request object
    Plugin.prototype.request = {};
    Plugin.prototype.request.back = function(){
        plugin.request.start();
        $.ajax({
            url: $('#DEMap-panel a.back-button').attr('href'),
            dataType: 'JSON',
            success: plugin.request.process
        });
        return false;
        
    }
    Plugin.prototype.request.send = function()
    {
        plugin.request.start();
        console.log();
        $.ajax({
            url: $(plugin.panel).children('form').attr('action'),//$(plugin.panel).children('form').attr('action'),
            data: $(plugin.panel).children('form').serialize()+'&'+$.param(plugin.options.pageSize),
            dataType: 'JSON',
            success: plugin.request.process
        });
        
        
    }
    Plugin.prototype.request.sendEditForm = function()
    {
        plugin.request.start();
        $.ajax({
            url: $(this).attr('action'),
            data: $(this).serialize(),
            type: 'POST',
            dataType: 'JSON',
            success: plugin.request.processEdit
        });
        return false;
    }
    Plugin.prototype.request.start = function()
    {
        $(plugin.container).addClass('loading');
    }
    Plugin.prototype.request.end = function()
    {
        plugin.map.autofit();
        $(plugin.container).removeClass('loading');
    }
    Plugin.prototype.request.process = function(data)
    {
        plugin.renderPanel(data.panel);
        $(plugin.panel).find('.buttons').buttonset();
        //clear all objects from map
        $(plugin.element).gmap3({
            action: 'clear'
        });
        plugin.objects = {};
        plugin.objects.Route = [];
        plugin.objects.Place = [];
        plugin.objects.Area = [];
        if(data.pages.length)
        {
            var form = $(plugin.panel).children('form').serializeArray();
            var newForm = [];
            $.each(form,function(index,element){
                if(element.name!=='backUrl' && element.name!=='type[]') 
                    newForm.push(element);    
            });
                
            form = jQuery.param(newForm);//+'&'+$.param({size:data.size,page:element.page});
            var requests = [];
            //clean objects
            plugin.counter = 0;
            $.each(data.pages,function(index,element){
                
                var dataUrl = form+'&'+$.param({
                    pagesize:data.pagesize,
                    page:element[1],
                    type:[element[0]]
                });
                $.jStorage.flush();
                var request = $.jStorage.get(plugin.options.baseUrl+'/js/data&'+dataUrl);
                if(!request)
                {
                    requests.push(function(){
                        $.ajax({
                            url: plugin.options.baseUrl+'/js/data',
                            data:dataUrl,
                            type: 'GET',
                            dataType: 'JSON',
                            cache: true,
                            success:function(data){
                                //$.jStorage.set(plugin.options.baseUrl+'/js/data&'+dataUrl, data);
                                //$.jStorage.setTTL(plugin.options.baseUrl+'/js/data&'+dataUrl, 30000);
                                if(data.objects.Route)
                                    $.merge(plugin.objects.Route,data.objects.Route);
                                if(data.objects.Area)
                                    $.merge(plugin.objects.Area,data.objects.Area);
                                if(data.objects.Place)
                                    $.merge(plugin.objects.Place,data.objects.Place);
                            }
                        });
                    }
                    );
                }
                else
                {
                    requests.push(function(){
                        data = request;
                        if(data.objects.Route)
                            $.merge(plugin.objects.Route,data.objects.Route);
                        if(data.objects.Area)
                            $.merge(plugin.objects.Area,data.objects.Area);
                        if(data.objects.Place)
                            $.merge(plugin.objects.Place,data.objects.Place);
                    });
                }
                
                
            });
            async.parallel(requests);
            $(document).ajaxStop(function() {
                plugin.request.processData();
                plugin.objects.Area = [];
                plugin.objects.Place = [];
                plugin.objects.Route = [];
                plugin.map.zoomChanged();
                plugin.map.autofit();
                plugin.request.end();
            });
        }
        else
        {
            console.log('no pages?');
            plugin.objects.Area = [];
            plugin.objects.Place = [];
            plugin.objects.Route = [];
            plugin.map.zoomChanged();
            plugin.map.autofit();
            plugin.request.end();
        }
            
        
    }
    Plugin.prototype.request.processData = function(scenario)
    {
        //set appropriate scenario
        if(scenario===undefined)
            scenario = 'list';
        
        if(plugin.objects.Route.length>0)
        {
            if(plugin.options.debugCreate)console.time('creating routes');
            //$.each(plugin.objects.Route,plugin.route.add);
            plugin.route.add(plugin.objects.Route,'list');
            if(plugin.options.debugCreate)console.timeEnd('creating routes');
        }
        if(plugin.objects.Area.length>0)
        {
            if(plugin.options.debugCreate)console.time('creating areas');
            plugin.area.add(plugin.objects.Area,'list');
            //$.each(plugin.objects.Area,plugin.area.add);
            if(plugin.options.debugCreate)console.timeEnd('creating areas');
        }
        if(plugin.objects.Place.length>0)
        {
            if(plugin.options.debugCreate)console.time('creating places');
            plugin.place.add(plugin.objects.Place,'list');
            if(plugin.options.debugCreate)console.timeEnd('creating places');
        }
    }
    Plugin.prototype.request.processSingle = function(data)
    {
        plugin.renderPanel(data.panel);
        //clear all objects from map
        $(plugin.element).gmap3({
            action: 'clear'
        });
        if(data.objects.Route)
            plugin.route.add(data.objects.Route,'single');
        if(data.objects.Area)
            plugin.area.add(data.objects.Area,'single');
        if(data.objects.Place)
            plugin.place.add(data.objects.Place,'single');
            
        //plugin.place.addAll(data.objects.Place);
        plugin.map.zoomChanged();
        plugin.request.end();
    }
    Plugin.prototype.request.processEdit = function(data)
    {
        plugin.renderPanel(data.panel);
        //clear all objects from map
        $(plugin.element).gmap3({
            action: 'clear'
        });
        if(data.objects.Route)
            plugin.route.add(data.objects.Route,'edit');
        if(data.objects.Area)
            plugin.area.add(data.objects.Area,'edit');
        if(data.objects.Place)
            plugin.place.add(data.objects.Place,'edit');
        //plugin.place.addAll(data.objects.Place);
        plugin.map.zoomChanged();
        plugin.request.end();
    }
    //Map object
    Plugin.prototype.map = {};
    Plugin.prototype.map.autofit = function()
    {
        if(plugin.options.autofit)
        {
            $(plugin.element).gmap3({
                action: 'autofit'
            });
            if($(plugin.element).gmap3('get').getZoom()>plugin.options.minZoom)
                $(plugin.element).gmap3('get').setZoom(plugin.options.minZoom);
        }
    }
    Plugin.prototype.map.zoomChanged = function()
    {
        return;
        if($(plugin.element).gmap3('get').getZoom()<plugin.options.routeLod)
        {
            $.each(plugin.Route,function(index,route){
                $.each(route.markers,function(index,marker){
                    if(marker.getVisible())
                        marker.setVisible(false);
                });
            });
        }
        else
        {
            $.each(plugin.Route,function(index,route){
                $.each(route.markers,function(index,marker){
                    if(!marker.getVisible())
                        marker.setVisible(true);
                });
            });
        }
    }
    //Filter object
    Plugin.prototype.filter = {};
    Plugin.prototype.filter.bindEvents = function()
    {
        $(document).on({
            click: function(){
                //select right
                //google.maps.event.trigger(plugin.area.findAllByTag('Area-'+ $(this).find('input.id').val())[0],'click');
                plugin.filter.slide($(this).parent().find('.content'),$(this).parent().find('.slide-value'));
            }
        },plugin.options.panelId+' .filter.slide .name');
        $(document).on({
            click: function(){
                //select right
                //google.maps.event.trigger(plugin.area.findAllByTag('Area-'+ $(this).find('input.id').val())[0],'click');
                $(this).toggleClass('up').siblings('ul.list').slideToggle();
            }
        },plugin.options.panelId+' .objects>.name');
    }
    Plugin.prototype.filter.slide = function(element,valueElement)
    {
        $(element).slideToggle(plugin.options.slideSpeed,function(){
            var value = $(valueElement).val();
            if(value==1)
            {
                $(element).parent().addClass('up');
                value=0;
            }
            else
            {
                value=1;
                $(element).parent().removeClass('up');
            }
            $(valueElement).val(value);
        });
    }

    
    /*Route create*/
    Plugin.prototype.route.section.create = function(section,scenario)
    {
        //set options & events based on place, category or defaults
        if(section.style===undefined)
            section.style={};
        if(section.style.normal===undefined)
            section.style.normal={};
        if(section.style.hover===undefined)
            section.style.hover={};
        //create path for section
        var path = [];
        $.each(section.points,function(index,element){
            element.index = index;
            element.section = section;
            path.push(plugin.route.section.createPoint(element,scenario,index));
        });
        return {
            path:path,
            data: $.extend(section,{
                element:$(plugin.panel).find('ul.Route.list li input[value='+section.id+']').parent(),
                normalOptions: $.extend(true,plugin.route.section.options[scenario].normal(),section.style.normal),
                hoverOptions: $.extend(true,plugin.route.section.options[scenario].hover(),section.style.hover)
            }),
            tag: 'Route-'+section.id,
            options: $.extend(true,plugin.route.section.options[scenario].normal(),section.options),
            callback: function(polyline){
                section.polyline = polyline;
                if(scenario==='edit')
                {
                    plugin.route.section.createEventListener(polyline);
                }
                section.polyline.getPath().data = section;
            },
            events: plugin.route.section.events[scenario]()
        };
    }
    Plugin.prototype.route.section.createPoint = function(point,scenario,index)
    {
        return $.extend(new google.maps.LatLng(point.latitude,point.longitude),{
            index:index,
            data:point
        });
    }
    //Route polygon editable events registering
    Plugin.prototype.route.section.createEventListener = function(polyline)
    {
        google.maps.event.addListener(polyline.getPath(), 'set_at',plugin.route.section.set_at);
        google.maps.event.addListener(polyline.getPath(), 'insert_at',plugin.route.section.insert_at);
        google.maps.event.addListener(polyline.getPath(), 'remove_at',plugin.route.section.remove_at);
    }
    Plugin.prototype.route.section.set_at = function(index,point){
        console.log(point);
        var realName = plugin.route.findRealName(point.data.order,point.data.section.order);
        var realNameSection = plugin.route.findRealNameSection(point.data.section.order);

        $('#DEMap-panel form input[name="Route[sections]['+realNameSection+'][points]['+realName+'][location][1]"]').val(parseFloat(this.getAt(index).Oa));
        $('#DEMap-panel form input[name="Route[sections]['+realNameSection+'][points]['+realName+'][location][0]"]').val(parseFloat(this.getAt(index).Pa));
        this.getAt(index).data = point.data
    }
    Plugin.prototype.route.section.insert_at = function(index)
    {
        var polyline = this;
        point = this.getAt(index);
        point.data = jQuery.extend({}, this.getAt(index-1).data);
        point.data.order = parseInt(this.getAt(index-1).data.order)+1;
        point.data.longitude = point.Pa; 
        point.data.latitude = point.Oa;

        for(var iback=this.getLength()-1;iback>=0;iback--)
        {
            eindex = iback;
            element = this.getAt(eindex);
            if(eindex>index)
            {
                var newindex = parseInt(element.data.order)+1;
                var realName = plugin.route.findRealName(element.data.order,element.data.section.order);
                var realNameSection = plugin.route.findRealNameSection(element.data.section.order);
                $('#DEMap-panel form input[name="Route[sections]['+realNameSection+'][points]['+realName+'][order]"]').val(newindex);
                //add form elements!
                polyline.getAt(eindex).data.order = newindex;
            }
        }
        realNameSection = plugin.route.findRealNameSection(point.data.section.order);
        var maxPos = this.getLength()+10;
        var form  =[];
        form.push('<input class="order section-'+point.data.section.order+'" name="Route[sections]['+realNameSection+'][points]['+maxPos+'][order]" type="hidden" value="'+point.data.order+'">');
        form.push('<input class="section-'+point.data.section.order+'" name="Route[sections]['+realNameSection+'][points]['+maxPos+'][location][0]" type="hidden" value="'+point.Pa+'">');
        form.push('<input class="section-'+point.data.section.order+'" name="Route[sections]['+realNameSection+'][points]['+maxPos+'][location][1]" type="hidden" value="'+point.Oa+'">');
        point.info = maxPos;
        $('#DEMap-panel form').append(form.join(''));
    }
    Plugin.prototype.route.section.remove_at = function(index,point)
    {
        point = this.getAt(index);
        var realNameSection = plugin.route.findRealNameSection(point.data.section.order);
        var realName = plugin.route.findRealName(point.index,point.data.section.order);
        $('#DEMap-panel form input[name="Route[sections]['+realNameSection+'][points]['+realName+'][location][0]"]').remove();
        $('#DEMap-panel form input[name="Route[sections]['+realNameSection+'][points]['+realName+'][location][1]"]').remove();
        $('#DEMap-panel form input[name="Route[sections]['+realNameSection+'][points]['+realName+'][order]"]').remove();
    }
    /*Route default options*/
    Plugin.prototype.route.section.options.list.normal= function(){
        return {
            strokeColor: "#000000",
            strokeOpacity: 1.0,
            strokeWeight: 1,
            zIndex: 100
        };
    };  
    Plugin.prototype.route.section.options.list.hover = function(){
        return {
            strokeColor: "#FFFFF0",
            fillOpacity: 0.56
        };
    };  
    Plugin.prototype.route.section.options.single.normal = function(){
        return {
            strokeColor: "#FF00F0",
            strokeOpacity: 1.0,
            strokeWeight: 2,
            fillColor: "#FF0000",
            fillOpacity: 0.35,
            zIndex: 1
        };
    };
    Plugin.prototype.route.section.options.single.hover = function(){
        return {
            strokeColor: "#FF00F0"
        };
    };
    Plugin.prototype.route.section.options.edit.normal = function(){
        return {
            editable:true,
            strokeColor: "#FF00F0",
            strokeOpacity: 1.0,
            strokeWeight: 2,
            fillColor: "#FF0000",
            fillOpacity: 0.35,
            zIndex: 1
        };
    };
    Plugin.prototype.route.section.options.edit.hover = function(){
        return {
            strokeColor: "#FF00F0"
        };
    };
    /*Route default events*/
    Plugin.prototype.route.section.events.list = function(){
        return {
            click: plugin.route.section.click,
            rightclick: plugin.route.section.rightclick,
            mouseover: plugin.route.section.mouseover,
            mouseout: plugin.route.section.mouseout
        };
    };
    Plugin.prototype.route.section.events.single = function(){
        return {};
    };
    Plugin.prototype.route.section.events.edit = function(){
        return {
            
        };
    };
    /*Route actions*/
    Plugin.prototype.route.add = function(routes,scenario)
    {
        async.forEach(routes, function(route){
            plugin.route.section.add(route,route.sections,scenario);
        }, function(err){
            console.log(err,'error');
        });
    }
    Plugin.prototype.route.section.add = function(route,sections,scenario)
    {
        async.forEach(sections, function(section){
            //@TODO add inheritance of route style in create method
            //@TODO creating markers for sections
            console.log($.extend({
                action: 'addPolyline'
            },plugin.route.section.create(section,scenario)));
            section.id = route.id;
            $(plugin.element).gmap3($.extend({
                action: 'addPolyline'
            },plugin.route.section.create(section,scenario)));
        }, function(err){
            console.log(err,'error');
        });
    }
    Plugin.prototype.route.edit = function(id)
    {
        plugin.request.start();
        $.ajax({
            url: plugin.options.baseUrl+'/js/editRoute',
            type: 'GET',
            data: {
                id:id,
                backUrl:$(plugin.panel).find('input#backUrl').val()
            },
            dataType: 'JSON',
            success: plugin.request.processEdit
        });
    }
    Plugin.prototype.route.view = function(id)
    {
        plugin.request.start();
        $.ajax({
            url: plugin.options.baseUrl+'/js/viewRoute',
            data: {
                id:id,
                backUrl:$(plugin.panel).find('input#backUrl').val()
            },
            dataType: 'JSON',
            success: plugin.request.processSingle
        });
    }
    /*Route events*/
    Plugin.prototype.route.section.click = function(polyline,event,data)
    {
        plugin.route.view(data.id);
    }
    Plugin.prototype.route.section.rightclick = function(polyline,event,data)
    {
        plugin.route.edit(data.id);
    }
    Plugin.prototype.route.section.mouseover = function(polyline,event,data)
    {

        if(data.element)
        {
            $(data.element).addClass('hover');
            if(event && $(data.element).is(':visible'))
                $(plugin.panel).scrollTo(data.element,plugin.options.scroll);
        }
            
        polyline.setOptions(data.hoverOptions);
    }
    Plugin.prototype.route.section.mouseout = function(polyline,event,data)
    {
        if(data.element)
            $(data.element).removeClass('hover');
        polyline.setOptions(data.normalOptions);
    }
    /*Route misc functions*/
    Plugin.prototype.route.findRealName = function(order,section)
    {
        var name = undefined;
        order = parseInt(order);
        $('#DEMap-panel form input.order.section-'+section).each(function(index,element){
            if(parseInt($(element).val())===order)
            {
                name = $(element).attr('name');
                name = name.substring(name.indexOf('[points]')+'[points]'.length+1,name.lastIndexOf('[order]')-1);
            }
        });
        if(name===undefined)
            console.log(order,section);
        return name;
    }
    Plugin.prototype.route.findRealNameSection = function(order)
    {
        var name = undefined;
        $('#DEMap-panel form input.order-section').each(function(index,element){

            if($(element).val()==order)
            {
                name = $(element).attr('name');
                name = name.substring(name.indexOf('[sections]')+'[sections]'.length+1,name.lastIndexOf('[order]')-1);
            }
        });
        return name;
    }
    Plugin.prototype.route.bindEvents = function()
    {
        //bind list with proper object
        $(document).on({
            click: function(event){
                //select right
                google.maps.event.trigger(plugin.route.findAllByTag('Route-'+ $(this).find('input.id').val())[0],'click');
            },
            mouseenter: function(){
                //alert('enter');
                $.each(plugin.route.findAllByTag('Route-'+ $(this).find('input.id').val()),function(index,element){
                    google.maps.event.trigger(element,'mouseover');
                });
                
            },
            mouseleave: function(){
                //alert('leave');
                $.each(plugin.route.findAllByTag('Route-'+ $(this).find('input.id').val()),function(index,element){
                    google.maps.event.trigger(element,'mouseout');
                });
            }
        },plugin.options.panelId+' ul.Route.list li');
    }
    Plugin.prototype.route.findAllByTag = function(tag)
    {
        return $(plugin.element).gmap3({
            action:'get',
            name:'polyline',
            tag:tag,
            all:true
        });
    }
    
    
    //Area object
    /*Area create*/
    Plugin.prototype.area.create = function(area,scenario)
    {
        //set options & events based on place, category or defaults
        if(area.style===undefined)
            area.style={};
        if(area.style.normal===undefined)
            area.style.normal={};
        if(area.style.hover===undefined)
            area.style.hover={};
        //create area polygon path's
        var path = [];
        $.each(area.points,function(index,element){
            element.index = index;
            path.push(plugin.area.createPoint(element,scenario));
        });
        return {
            paths:path,
            data: $.extend(area,{
                element:$(plugin.panel).find('ul.Area.list li input[value='+area.id+']').parent(),
                normalOptions: $.extend(true,plugin.area.options[scenario].normal(),area.style.normal),
                hoverOptions: $.extend(true,plugin.area.options[scenario].hover(),area.style.hover)
            }),
            tag: 'Area-'+area.id,
            options: $.extend(true,plugin.area.options[scenario].normal(),area.options),
            callback: function(polygon){
                area.polygon = polygon;
                if(scenario==='edit')
                {
                    plugin.area.createEventListener(polygon);
                }
            },
            events: plugin.area.events[scenario]()
        };
    }
    Plugin.prototype.area.createPoint = function(point,scenario,index)
    {
        return $.extend(new google.maps.LatLng(point.latitude,point.longitude),{
            index:index,
            data:point
        });
    }
    /*Area default styles*/
    Plugin.prototype.area.options.list.normal= function(){
        return {
            strokeColor: "#ff00ff",
            strokeOpacity: 1.0,
            strokeWeight: 2,
            fillColor: "#FF0000",
            fillOpacity: 0.35,
            zIndex: 1
        };
    };  
    Plugin.prototype.area.options.list.hover = function(){
        return {
            strokeColor: "#FFFFF0",
            fillOpacity: 0.56
        };
    };  
    Plugin.prototype.area.options.single.normal = function(){
        return {
            strokeColor: "#FF00F0",
            strokeOpacity: 1.0,
            strokeWeight: 2,
            fillColor: "#FF0000",
            fillOpacity: 0.35,
            zIndex: 1
        };
    };
    Plugin.prototype.area.options.single.hover = function(){
        return {
            strokeColor: "#FF00F0"
        };
    };
    Plugin.prototype.area.options.edit.normal = function(){
        return {
            editable:true,
            strokeColor: "#FF00F0",
            strokeOpacity: 1.0,
            strokeWeight: 2,
            fillColor: "#FF0000",
            fillOpacity: 0.35,
            zIndex: 1
        };
    };
    Plugin.prototype.area.options.edit.hover = function(){
        return {
            strokeColor: "#FF00F0"
        };
    };
    /*Area default events*/
    Plugin.prototype.area.events.list = function(){
        return {
            click: plugin.area.click,
            rightclick: plugin.area.rightclick,
            mouseover: plugin.area.mouseover,
            mouseout: plugin.area.mouseout
        };
    };
    Plugin.prototype.area.events.single = function(){
        return {};
    };
    Plugin.prototype.area.events.edit = function(){
        return {
            
        };
    };
    //Area polygon editable events registering
    Plugin.prototype.area.createEventListener = function(polygon)
    {
        google.maps.event.addListener(polygon.getPaths().getAt(0), 'set_at',plugin.area.set_at);
        google.maps.event.addListener(polygon.getPaths().getAt(0), 'insert_at',plugin.area.insert_at);
        google.maps.event.addListener(polygon.getPaths().getAt(0), 'remove_at',plugin.area.remove_at);
    }
    Plugin.prototype.area.set_at = function(index,point){
        var realName = plugin.area.findRealName(point.data.order);
        $('#DEMap-panel form input[name="Area[points]['+realName+'][location][1]"]').val(parseFloat(this.getAt(index).Oa));
        $('#DEMap-panel form input[name="Area[points]['+realName+'][location][0]"]').val(parseFloat(this.getAt(index).Pa));
        this.getAt(index).data = point.data
    }
    Plugin.prototype.area.insert_at = function(index){
        var polyline = this;
        point = this.getAt(index);
        point.data = jQuery.extend({}, this.getAt(index-1).data);
        point.data.order = parseInt(this.getAt(index-1).data.order)+1;
        point.data.longitude = point.Pa; 
        point.data.latitude = point.Oa;

        for(var iback=this.getLength()-1;iback>=0;iback--)
        {
            eindex = iback;
            element = this.getAt(eindex);
            if(eindex>index)
            {
                var newindex = parseInt(element.data.order)+1;
                var realName = plugin.area.findRealName(element.data.order);
                $('#DEMap-panel form input[name="Area[points]['+realName+'][order]"]').val(newindex);
                //add form elements!
                polyline.getAt(eindex).data.order = newindex;
            }
        }
        var maxPos = this.getLength()+10;
        var form  =[];
        form.push('<input class="order " name="Area[points]['+maxPos+'][order]" type="hidden" value="'+point.data.order+'">');
        form.push('<input name="Area[points]['+maxPos+'][location][0]" type="hidden" value="'+point.Pa+'">');
        form.push('<input name="Area[points]['+maxPos+'][location][1]" type="hidden" value="'+point.Oa+'">');
        point.index = point.data.order;
        $('#DEMap-panel form').append(form.join(''));
    }
    Plugin.prototype.area.remove_at = function(index,point){
        console.log(point);

        var realName = plugin.area.findRealName(point.index);
        $('#DEMap-panel form input[name="Area[points]['+realName+'][location][0]"]').remove();
        $('#DEMap-panel form input[name="Area[points]['+realName+'][location][1]"]').remove();
        $('#DEMap-panel form input[name="Area[points]['+realName+'][order]"]').remove();
    }
    /*Area actions*/
    Plugin.prototype.area.add = function(areas,scenario)
    {
        async.forEach(areas, function(area){
            $(plugin.element).gmap3($.extend({
                action: 'addPolygon'
            },plugin.area.create(area,scenario)));
        }, function(err){
            console.log(err,'error');
        });
        
    }
    Plugin.prototype.area.edit = function(id)
    {
        plugin.request.start();
        $.ajax({
            url: plugin.options.baseUrl+'/js/editArea',
            type: 'GET',
            data: {
                id:id,
                backUrl:$(plugin.panel).find('input#backUrl').val()
            },
            dataType: 'JSON',
            success: plugin.request.processEdit
        });
    }
    Plugin.prototype.area.view = function(id)
    {
        plugin.request.start();
        $.ajax({
            url: plugin.options.baseUrl+'/js/viewArea',
            data: {
                id:id,
                backUrl:$(plugin.panel).find('input#backUrl').val()
            },
            dataType: 'JSON',
            success: plugin.request.processSingle
        });
    }
    /*Area events*/
    Plugin.prototype.area.click = function(polygon,event,data)
    {
        plugin.area.view(data.id);
    }
    Plugin.prototype.area.rightclick = function(polygon,event,data)
    {
        plugin.area.edit(data.id);
    }
    Plugin.prototype.area.mouseover = function(polygon,event,data)
    {
        if(data.element)
        {
            $(data.element).addClass('hover');
            if(event && $(data.element).is(':visible'))
                $(plugin.panel).scrollTo(data.element,plugin.options.scroll);
        }
        //scroll to this element

        polygon.setOptions(data.hoverOptions);
    }
    Plugin.prototype.area.mouseout = function(polygon,event,data)
    {
        if(data.element)
            $(data.element).removeClass('hover');
        polygon.setOptions(data.normalOptions);
    }
    /*Area misc functions*/
    Plugin.prototype.area.findRealName = function(order)
    {
        var name = undefined;
        order = parseInt(order);
        $('#DEMap-panel form input.order').each(function(index,element){
            if(parseInt($(element).val())===order)
            {
                name = $(element).attr('name');
                name = name.substring(name.indexOf('[points]')+'[points]'.length+1,name.lastIndexOf('[order]')-1);
            }
        });
        if(name===undefined)
            console.log(order);
        return name;
    }
    Plugin.prototype.area.findAllByTag = function(tag)
    {
        return $(plugin.element).gmap3({
            action:'get',
            name:'polygon',
            tag:tag,
            all:true
        });
    }
    Plugin.prototype.area.bindEvents = function()
    {
        $(document).on({
            click: function(){
                //select right
                google.maps.event.trigger(plugin.area.findAllByTag('Area-'+ $(this).find('input.id').val())[0],'click');
            },
            mouseenter: function(){
                //alert('enter');
                $.each(plugin.area.findAllByTag('Area-'+ $(this).find('input.id').val()),function(index,element){
                    google.maps.event.trigger(element,'mouseover');
                });

            },
            mouseleave: function(){
                //alert('leave');
                $.each(plugin.area.findAllByTag('Area-'+ $(this).find('input.id').val()),function(index,element){
                    google.maps.event.trigger(element,'mouseout');
                });
            }
        },plugin.options.panelId+' ul.Area.list li');
    }



    /*Create place*/
    Plugin.prototype.place.create = function(place,scenario)
    {
        //set options & events based on place, category or defaults
        //@TODO add category to extend
        if(place.style===undefined)
            place.style={};
        if(place.style.normal===undefined)
            place.style.normal={};
        if(place.style.hover===undefined)
            place.style.hover={};
        return {
            latLng: [place.location.latitude,place.location.longitude],
            data: $.extend(place,{
                element:$(plugin.panel).find('ul.Place.list li input[value='+place.id+']').parent(),
                normalOptions: $.extend(true,plugin.place.options[scenario].normal(),place.style.normal),
                hoverOptions: $.extend(true,plugin.place.options[scenario].hover(),place.style.hover)
            }),
            tag: 'Place-'+place.id,
            options: $.extend(true,plugin.place.options[scenario].normal(),place.options),
            callback: function(marker){
                place.marker = marker
            },
            events: plugin.place.events[scenario]()
            
        };
    }
    /*Place default styles*/
    Plugin.prototype.place.options.list.normal= function(){
        return {
            clickable: true,
            icon:{
                size:{
                    width:8,
                    height:8
                },
                url: plugin.options.iconUrl,
                origin:{
                    x:3232,
                    y:0
                }
            },
            title:null,
            visible:true,
            zIndex:1000
        };
    };  
    Plugin.prototype.place.options.list.hover = function(){
        return {
            clickable: true,
            icon:{
                size:{
                    width:22,
                    height:32
                },
                url: plugin.options.iconUrl,
                origin:{
                    x:3242,
                    y:0
                }
            },
            title:null,
            visible:true,
            zIndex:1000
        };
    };  
    Plugin.prototype.place.options.single.normal = function(){
        return {
            clickable: false,
            icon:{
                size:{
                    width:22,
                    height:32
                },
                url: plugin.options.iconUrl,
                origin:{
                    x:3242,
                    y:0
                }
            },
            title:null,
            visible:true,
            zIndex:1000
        };
    };
    Plugin.prototype.place.options.single.hover = function(){
        return {
            clickable: false,
            icon:{
                size:{
                    width:22,
                    height:32
                },
                url: plugin.options.iconUrl,
                origin:{
                    x:3242,
                    y:0
                }
            },
            title:null,
            visible:true,
            zIndex:1000
        };
    };
    Plugin.prototype.place.options.edit.normal = function(){
        return {
            clickable: false,
            draggable: true,
            icon:null,
            title:null,
            visible:true,
            zIndex:1000
        };
    };
    Plugin.prototype.place.options.edit.hover = function(){
        return {
            clickable: false,
            draggable: true,
            icon:null,
            title:null,
            visible:true,
            zIndex:1000
        };
    };
    /*Place default events*/
    Plugin.prototype.place.events.list = function(){
        return {
            click: plugin.place.click,
            rightclick: plugin.place.rightclick,
            mouseover: plugin.place.mouseover,
            mouseout: plugin.place.mouseout
        };
    };
    Plugin.prototype.place.events.single = function(){
        return {};
    };
    Plugin.prototype.place.events.edit = function(){
        return {
            dragend: plugin.place.drag
        };
    };
    /*Place adding*/
    Plugin.prototype.place.add = function(places,scenario)
    {
        async.forEach(places, function(place){
            $(plugin.element).gmap3($.extend({
                action: 'addMarker'
            },plugin.place.create(place,scenario)));
        }, function(err){
            console.log(err);
        });

    }
    /*Place misc functions*/
    Plugin.prototype.place.bindEvents = function()
    {
        //bind list with proper object
        /*if(plugin.options.debug)
            console.log('Binding place events');*/
        $(document).on({
            click: function(){
                //select right
                google.maps.event.trigger(plugin.place.findAllByTag('Place-'+ $(this).find('input.id').val())[0],'click');
            },
            mouseenter: function(){
                //alert('enter');
                
                $.each(plugin.place.findAllByTag('Place-'+ $(this).find('input.id').val()),function(index,element){
                    google.maps.event.trigger(element,'mouseover');
                });
                
            },
            mouseleave: function(){
                //alert('leave');
                $.each(plugin.place.findAllByTag('Place-'+ $(this).find('input.id').val()),function(index,element){
                    google.maps.event.trigger(element,'mouseout');
                });
            }
        },plugin.options.panelId+' ul.Place.list li');
    }
    Plugin.prototype.place.findAllByTag = function(tag)
    {
        //console.log($(plugin.element).gmap3({action:'get',tag:tag,name:'marker',all:true}));
        //return $(plugin.element).gmap3({action:'get',name:'marker',tag:tag,all:true});
        return $(plugin.element).gmap3({
            action:'get',
            name:'marker',
            tag:tag,
            all:true
        });
    }
    /*Place actions*/
    Plugin.prototype.place.view = function(id)
    {
        plugin.request.start();
        $.ajax({
            url: plugin.options.baseUrl+'/js/viewPlace',
            data: {
                id:id,
                backUrl:$(plugin.panel).find('input#backUrl').val()
            },
            dataType: 'JSON',
            success: plugin.request.processSingle
        });
    }
    Plugin.prototype.place.edit = function(id)
    {
        plugin.request.start();
        $.ajax({
            url: plugin.options.baseUrl+'/js/editPlace',
            type: 'GET',
            data: {
                id:id,
                backUrl:$(plugin.panel).find('input#backUrl').val()
            },
            dataType: 'JSON',
            success: plugin.request.processEdit
        });
    }
    /*Place event functions*/
    Plugin.prototype.place.click = function(marker,event,data)
    {
        plugin.place.view(data.id);
    }
    Plugin.prototype.place.rightclick = function(marker,event,data)
    {
        plugin.place.edit(data.id);
    }
    Plugin.prototype.place.mouseover = function(marker,event,data)
    {
        if(data.element)
        {
            $(data.element).addClass('hover');
            if(event && $(data.element).is(':visible'))
                $(plugin.panel).scrollTo(data.element,plugin.options.scroll);
            $(plugin.element).gmap3({
                action:'get'
            }).panToBounds(new google.maps.LatLngBounds().extend(marker.position));
            marker.setOptions(
                data.hoverOptions
                );
        }
    }
    Plugin.prototype.place.mouseout = function(marker,event,data)
    {
        if(data.element)
            $(data.element).removeClass('hover');
        marker.setOptions(
            data.normalOptions
            );
    }
    Plugin.prototype.place.drag = function(marker)
    {
        $(plugin.panel).find('.latitude').val(marker.position.Oa);
        $(plugin.panel).find('.longitude').val(marker.position.Pa);
    }
        
    //
    $.fn[pluginName] = function ( options ) {
        return this.each(function () {
            if (!$.data(this, 'plugin_' + pluginName)) {
                $.data(this, 'plugin_' + pluginName, new Plugin( this, options ));
            }
        });
    }

})( jQuery, window, document );