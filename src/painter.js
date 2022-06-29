var web_socket = null;
function createPainter(parent, width, height) {
	var title = elt("h1", null, "お絵かきソフト");
	var [canvas,ctx] = createCanvas(width, height);
	var toolbar = elt("div", null);
	for(var name in controls) {
		toolbar.appendChild(controls[name](ctx));
	}
	toolbar.style.fontSize = "small";
	toolbar.style.marginBottom = "3px";
	//第二引数以降は子要素、
	parent.appendChild(elt("div", null, title,toolbar, canvas));

    //WebSocet周り
    web_socket = new WebSocket('ws://133.27.175.30:1145'); // サーバーのアドレスを指定
    web_socket.binaryType = 'arraybuffer';
    web_socket.onmessage = on_message;

}

function on_message(recv_data)
{
 var recv_image_data = new Uint8Array(recv_data.data);
 const APPLY_MAX =1024;
 var encodedStr='';
 for(var i=0;i<recv_image_data.length;i+=APPLY_MAX){
     encodedStr += String.fromCharCode.apply(null, recv_image_data.slice(i,i+APPLY_MAX));
 }
 document.getElementById("img").src = 'data:image/png;base64,' + window.btoa(encodedStr);
}

function createCanvas(canvasWidth,canvasHeight) {
	var canvas = elt("canvas", { width: canvasWidth, height: canvasHeight });
	var ctx = canvas.getContext("2d");
	canvas.style.border = "1px solid gray";
	//canvas.style.cursor = "pointer";
    //背景色白で初期化
    ctx.fillStyle="rgb(255,255,255)";
    ctx.fillRect(0,0,canvasWidth,canvasHeight);
	saveToHistory(ctx);

	canvas.addEventListener("mousedown", function(e) {
		var event = document.createEvent("HTMLEvents");
		event.initEvent("change", false, true);
		colorInput.dispatchEvent(event);
		paintTools[paintTool](e,ctx);
	}, false);
	canvas.addEventListener("dragover", function(e) {
		e.preventDefault();
	}, false);
	canvas.addEventListener("drop", function(e) {
		var files = e.dataTransfer.files;
		if( files[0].type.substring(0,6) !== "image/" ) return;
		loadImageURL(ctx, URL.createObjectURL(files[0]));
		e.preventDefault();
	}, false);
	return [canvas,ctx];
}

function relativePosition(event, element) {
	var rect = element.getBoundingClientRect();
	return { x: Math.floor(event.clientX - rect.left),
			 y: Math.floor(event.clientY - rect.top ) };
}
function distance(p, q) {
    var a = q.x - p.x;
    var b = q.y - p.y;
    return Math.sqrt(a * a + b * b)
}
var paintTool;	
var paintTools = Object.create(null);	

paintTools.brush = function(e, ctx) {
	ctx.lineCap   = "round";
	ctx.lineJoin  = "round";
	var img = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
	
	var p = relativePosition(e, ctx.canvas);
	ctx.beginPath();
	ctx.moveTo(p.x,p.y);
	setDragListeners(ctx, img, function(q) {
		ctx.lineTo(q.x,q.y);	
		ctx.stroke();		
	});
};

// * line：線を描くツール
paintTools.line = function(e, ctx) {
	ctx.lineCap = "round";
	var img = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
	var p = relativePosition(e, ctx.canvas);
	setDragListeners(ctx, img, function(q) {
		ctx.beginPath();
		ctx.moveTo(p.x,p.y); ctx.lineTo(q.x,q.y);
		ctx.stroke();
	});
};
paintTools.rectangle = function(e, a) {
    a.lineJoin = "miter";
    var b = a.getImageData(0, 0, a.canvas.width, a.canvas.height);
    var p = relativePosition(e, a.canvas);
    setDragListeners(a, b, function(q) {
        a.strokeRect(p.x, p.y, q.x - p.x, q.y - p.y)
    })
};
paintTools.fillrect = function(e, a) {
    a.lineJoin = "miter";
    var b = a.getImageData(0, 0, a.canvas.width, a.canvas.height);
    var p = relativePosition(e, a.canvas);
    setDragListeners(a, b, function(q) {
        a.fillRect(p.x, p.y, q.x - p.x, q.y - p.y)
    })
};
paintTools.circle = function(e, c) {
    var d = c.getImageData(0, 0, c.canvas.width, c.canvas.height);
    var p = relativePosition(e, c.canvas);
    setDragListeners(c, d, function(q) {
        var a = q.x - p.x;
        var b = q.y - p.y;
        var r = Math.sqrt(a * a + b * b);
        c.beginPath();
        c.arc(p.x, p.y, r, 0, 2 * Math.PI, false);
        c.stroke()
    })
};
paintTools.circleFill = function(e, c) {
    var d = c.getImageData(0, 0, c.canvas.width, c.canvas.height);
    var p = relativePosition(e, c.canvas);
    setDragListeners(c, d, function(q) {
        var a = q.x - p.x;
        var b = q.y - p.y;
        var r = Math.sqrt(a * a + b * b);
        c.beginPath();
        c.arc(p.x, p.y, r, 0, 2 * Math.PI, false);
        c.fill()
    })
};
paintTools.spray = function(e, d) {
    var f = e;
    var r = d.lineWidth / 2;
    var g = Math.ceil(2 * Math.PI * r * r / 35);
    var h = setInterval(function() {
        spray(f)
    }, 30);
    document.onmousemove = function(e) {
        f = e
    };
    document.onmouseup = function(e) {
        clearInterval(h);
        document.onmousemove = null;
        document.onmouseup = null;
        saveToHistory(d)
    };

    function spray(a) {
        var p = relativePosition(a, d.canvas);
        for (var i = 0; i < g; i++) {
            var b = 1 - 2 * Math.random();
            var c = 1 - 2 * Math.random();
            if (b * b + c * c < 1) {
                d.beginPath();
                d.arc(p.x + r * b, p.y + r * c, 0.6, 0, 2 * Math.PI);
                d.fill()
            }
        }
    }
};
paintTools.raindrops = function(e, c) {
    var d = 0.2;
    var f = 2.0;
    var g = c.lineWidth;
    var h = 0;
    var i = c.getImageData(0, 0, c.canvas.width, c.canvas.height);
    var p = prev = relativePosition(e, c.canvas);
    document.onmousemove = function(e) {
        draw(relativePosition(e, c.canvas))
    };
    document.onmouseup = function(e) {
        document.onmousemove = null;
        document.onmouseup = null;
        saveToHistory(c)
    };

    function draw(q) {
        h += distance(q, prev);
        if (h > g) {
            var r = (d + Math.random() * (1 - d)) * c.lineWidth;
            var a = normRandom(0, c.lineWidth);
            var b = normRandom(0, c.lineWidth);
            h = 0;
            c.beginPath();
            c.arc(q.x + a, q.y + b, r, 0, 2 * Math.PI);
            c.fill()
        }
        prev = q
    }
};

function normRandom(m, s) {
    var a = 1 - Math.random();
    var b = 1 - Math.random();
    var c = Math.sqrt(-2 * Math.log(a));
    if (0.5 - Math.random() > 0) {
        return c * Math.sin(Math.PI * 2 * b) * s + m
    } else {
        return c * Math.cos(Math.PI * 2 * b) * s + m
    }
}
paintTools.rainbow = function(e, a) {
    var b = ["red", "orange", "yellow", "green", "cyan", "blue", "violet"];
    var c = 0;
    var d = a.lineWidth * 1.25;
    var f = 0;
    a.lineCap = "round";
    a.lineJoin = "round";
    var g = a.strokeStyle;
    a.strokeStyle = b[c];
    var h = a.getImageData(0, 0, a.canvas.width, a.canvas.height);
    var p = prev = relativePosition(e, a.canvas);
    document.onmousemove = function(e) {
        draw(relativePosition(e, a.canvas))
    };
    document.onmouseup = function(e) {
        document.onmousemove = null;
        document.onmouseup = null;
        saveToHistory(a);
        a.strokeStyle = g
    };

    function draw(q) {
        f += distance(q, prev);
        if (f > d) {
            c++;
            if (c >= b.length) c = 0;
            a.strokeStyle = b[c];
            f = 0
        }
        a.beginPath();
        a.lineTo(prev.x, prev.y);
        a.lineTo(q.x, q.y);
        a.stroke();
        prev = q
    }
};
function setDragListeners(ctx,img,draw) {
 	var mousemoveEventListener = function(e) {
		ctx.putImageData(img, 0, 0);
		draw(relativePosition(e, ctx.canvas));	
 	};
 	document.addEventListener("mousemove", mousemoveEventListener, false);
	document.addEventListener("mouseup", function(e) {
		ctx.putImageData(img, 0, 0);
		draw(relativePosition(e, ctx.canvas));
		document.removeEventListener("mousemove", mousemoveEventListener, false);
		document.removeEventListener("mouseup", arguments.callee, false);
		saveToHistory(ctx)
	},false);
 }
var controls = Object.create(null);
var colorInput;	
//ペイントツールの選択
controls.painter = function(ctx) {
	var DEFAULT_TOOL = 0;
	var select = elt("select", null);
	var label = elt("label", null, "描画ツール：", select);
	for(var name in paintTools) {
		select.appendChild(elt("option", {value: name}, name));
	}
	select.selectedIndex = DEFAULT_TOOL;
	paintTool = select.children[DEFAULT_TOOL].value;
	select.addEventListener("change", function(e) {
		paintTool = this.children[this.selectedIndex].value;
	},false);
	return label;
};
//色の選択(chromeならメニューが開くけどsafariだと色名直接入力に....)
controls.color = function(ctx) {
	var input = colorInput = elt("input", {type: "color"});
	var label = elt("label", null, " 色：", input);
	input.addEventListener("change", function(e) { 
		ctx.strokeStyle = this.value;
		ctx.fillStyle = this.value;
	},false);
	return label;
};
// 線幅の調整
controls.brushsize = function(ctx) {
	var size = [1,2,3,4,5,6,8,10,12,14,16,20,24,28];
	var select = elt("select", null);
	for(var i=0; i<size.length; i++) {
		select.appendChild(elt("option",{value:size[i].toString()},size[i].toString()));
	}
	select.selectedIndex = 2;
	ctx.lineWidth = size[select.selectedIndex];
	var label = elt("label",null," 線幅：",select);
	select.addEventListener("change", function(e) {
		ctx.lineWidth = this.value;
	},false);
	return label;
};
//アルファチャンネル 俗に言う透明度
controls.alpha = function(ctx) {
	var input = elt("input", {type:"number",min:"0", max:"1",step:"0.05",value:"1"});
	var label = elt("label", null, " 透明度：", input);
	input.addEventListener("change", function(e) {
		ctx.globalAlpha = this.value;
	},false);
	return label;
};
//画像生成して、imgのsrcに代入
controls.save = function(ctx) {
	var input = elt("input", {type: "button", value:"送信"});
	var label = elt("label", null, " ", input);
	input.addEventListener("click", function(e) {
		var png_dataURL = ctx.canvas.toDataURL();
        //png_dataURLを整形してからWebSocetで送信
        var base64_data=png_dataURL.split( "," )[1];
        web_socket.send(base64_data);
	}, false);
	return label;
};
controls.goBack = function(ctx) {
    var b = elt("input", {
        type: "button",
        value: "戻る"
    });
    b.addEventListener("click", function(e) {
        if (ihistory > 0) {
            ctx.putImageData(paintHistory[--ihistory], 0, 0)
        }
    }, false);
    return b
};
controls.goAhead = function(ctx) {
    var b = elt("input", {
        type: "button",
        value: "進む"
    });
    b.addEventListener("click", function(e) {
        if (ihistory + 1 < paintHistory.length) {
            ctx.putImageData(paintHistory[++ihistory], 0, 0)
        }
    }, false);
    return b
};
var paintHistory = [];
var ihistory = -1;

function saveToHistory(ctx) {
    paintHistory.length = ihistory + 1;
    paintHistory.push(ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height));
    ihistory++
}
