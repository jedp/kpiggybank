_.templateSettings = {
  interpolate: /\{\{(.+?)\}\}/g
};

var Blob = Backbone.Model.extend({});
var BlobCollection = Backbone.Collection.extend({model: Blob});
var Stream = Backbone.Model.extend({defaults: { streamLength: 7} });
var App = Backbone.Model.extend({});

var BlobView = Backbone.View.extend({
  model: Blob,

  tagName: 'div',

  template: _.template( $('#blob-view-template').html() ),

  className: 'blobView',

  events: {
    'click .closeButton': 'remove'
  },

  initialize: function() {
    return this;
  },

  render: function() {
    // remove existing displays, in case someone clicked a view button 
    // while a different blob was visible
    $('#blobDisplay').find('.blobView').remove();

    // i'm being lazy
    // but I'm just going to set and unset pp_text as needed
    this.model.set('pp_text', JSON.stringify(this.model, null, 2));

    $(this.el).html(this.template(this.model.toJSON()));
    $('#blobDisplay').append( $(this.el) );
    $('#blobDisplay').fadeIn();
    return this;
  },

  remove: function() {
    this.model.unset('pp_text', {silent: true});
    var el = this.el;
    $('#blobDisplay').fadeOut(function() {
      $(el).remove();
    });
  },


});

var StreamItemView = Backbone.View.extend({
  model: Blob,

  tagName: 'div',

  template: _.template( $('#stream-item-template').html() ),

  className: 'stream_item',

  events: {
    'click .viewLink': 'displayBlob'
  },

  initialize: function() {
    return this;
  },

  render: function() {
    var model = new Blob();
    $(this.el).html(this.template(this.model.toJSON()));
    return this;
  },

  displayBlob: function(evt) {
    var blobView = new BlobView({model: this.model});
    blobView.render()
  }
});

var StreamView = Backbone.View.extend({
  model: Stream,

  tagName: 'div',

  el: $('#stream'),

  events: {
    'receiveBlob': 'receiveBlob'
  },

  initialize: function() {
    this.blobs = new BlobCollection();
    this.views = [];

    _.bindAll(this, 'render');
    return this;
  },

  render: function() {
  },

  receiveBlob: function(data) {
    data.url = '/wsapi/interaction_data/?id=' + data._id;
    data.duration = JSONSelect.match('.event_stream :last-child number', data)[0] / 1000;
    data.readableDate = readableDate(data.timestamp);

    var blob = new Blob(data);

    var view = new StreamItemView({model: blob});

    // store and render 
    this.blobs.unshift(blob);
    this.views.unshift(view);

    // i don't understand why i can't do this in the jade template, 
    // but it won't let me get away with a(href=url) or a(href='#{url}') etc.
    // XXX wtf?
    var rendered = view.render().el;
    $(rendered).find('span.viewlink').children('a').attr('href', data.url);
    $(this.el).prepend(rendered);

    this.maybeTrim();
  },

  maybeTrim: function() {
    var model;
    var view;
    while (this.blobs.length > this.model.get('streamLength')) {
      model = this.blobs.pop();
      // Search for the view by model.
      // We could just pop from views, too, but 
      // I'm afraid of getting out of sync if something breaks.
      view = _(this.views).select(function(v) { return v.model === model })[0];
      this.views = _(this.views).without(view);
      $(view.el).remove();
    }
  }, 
});

var AppView = Backbone.View.extend({
  model: App,

  el: $('#content'),

  initialize: function() {
    $("#blobDisplay").hide();
    var stream = new StreamView({model: new Stream()});
    var socket = io.connect();
    socket.on('connect', function() {
      // w00t
    });
    socket.on('change', function(change) {
      stream.receiveBlob(change);
    });

    this.socket = socket;

    _.bindAll(this, 'render');
    return this;
  },

  render: function() {
    return this;
  },
});

/*
 * readableDate(1336760718279) -> '11:25:18 2012-May-11'
 */

function readableDate(timestamp) {
  var parts = (new Date(timestamp)).toLocaleString().split(' ');
  // of course you get different results depending on the platform you're on.
  if (isFinite(parseInt(parts[2]))) {
    // this is what I get in Node
    return parts[4] + ' ' + parts[3] + '-' + parts[1] + '-' + parts[2];
  } else {
    // this is what I get in the browser
    return parts[4] + ' ' + parts[3] + '-' + parts[2] + '-' + parts[1];
  }
}
