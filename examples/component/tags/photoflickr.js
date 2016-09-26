app.tag('photoflickr', null, function(context) {
	return {
		data: {
			author: '',
			description: '',
			link: '',
			image: '',
			tags: [],
			title: '',
			URLImage: function() {
				return "url("+ this.image + ") no-repeat";
			}
		},
		states: {
			class: '',
			over: 'none'
		},
		actions: ["render", "changeHover", "changeHoverOut", "flipDetail"],
		behaviors: {
			"shared" : {
				changeHover: function() {
					this.states.over = "";
				},
				changeHoverOut: function() {
					this.states.over = "none";
				}
			},
			"default" : {
				init: function() {
					this.states.over = "none";
				},
				flipDetail: function() {
					this.state("detail");
				},
				render: function() {
					return 	'<div class="fill" dt-style.background="#this.data.URLImage()" dt-onclick="@this.actions.flipDetail()"'
						+	' dt-onmouseenter="@this.actions.changeHover()" dt-onmouseleave="@this.actions.changeHoverOut()">'
						+	'	<div dt-style.display="#this.states.over" class="fill" style="background-color: black;position: absolute;float: left;opacity: 0.5;">'
						+	'		<span style="word-break:break-all;position:absolute;" dt-inner-Text="#this.data.title"></span>';
						+ 	'	</div>'
						+	'</div>'
				}
			},
			"detail" : {
				flipDetail: function() {
					this.state("default");
				},
				render: function() {
					return 	'<div class="fill" dt-style.background="#this.data.URLImage()">'
						+	'	<div  dt-onmouseleave="@this.actions.flipDetail()" class="fill" style="background-color: black;position: absolute;float: left;opacity: 0.5;">'
						+	'		<span style="word-break:break-all;position:absolute;" dt-inner-Text="#this.data.title"></span>';
						+ 	'	</div>'
						+	'</div>'
				}
			},
		}
	};
});