// first, "fetch" the data into a collection
var PartyCollection = Backbone.Collection.extend({
  url: "data/party.json",
  getAllTimes: function() {
    return this.chain().pluck('attributes')
      .pluck('time').uniq().value();
  },
  getPartiersAtTime: function(time) {
    return this.chain().groupBy(function(model) {
      return model.get('partier')
    }).filter(function(actions) {
      return actions[0].get('time') <= time
        && (actions[1] ? time < actions[1].get('time') : true);
    }).map(function(actions) {
      return {
        name: actions[0].get('partier'),
        entered: actions[0].get('time') === time,
        exit: actions[1] && (actions[1].get('time') - 100 === time)
      };
    }).value();
  }
});

var PartyView = Backbone.View.extend({
  initialize: function() {
    this.collection = this.options.collection;
    this.selectedTime;

    this.collection.on('reset', _.bind(this.render, this));
  },
  // then render two parts:
  // 1. the time
  // 2. the partiers at that time
  render: function() {
    var times = this.collection.getAllTimes();
    this.selectedTime = this.selectedTime || times[0];
    var partiers = this.collection.getPartiersAtTime(this.selectedTime);

    this.$el.html(this.renderTime(times));
    this.$el.append(this.renderPartiers(partiers));

    return this;
  },
  renderTime: function(times) {
    var $times = $('<div class="times"></div>'),
      that = this;
    _.each(times, function(time) {
      $times.append('<div class="btn '
        + (that.selectedTime === time ? 'btn-primary' : 'btn-default')
        + ' btn-xs partyTime">' 
        + time
      + '</div>');
    });
    return $times;
  },
  renderPartiers: function(partiers) {
    var $partiers = $('<div class="partiers"></div>');
    _.each(partiers, function(partier) {
      $partiers.append('<div class="label ' 
        + (partier.entered ? 'label-primary ' : '')
        + (partier.exit ? 'label-warning ': '')
        + (!partier.entered && !partier.exit ? 'label-default ': '')
        + 'partier">'
        + partier.name + '</div>');
    });
    return $partiers;
  },
  events: {
    'click .partyTime': 'update'
  },
  // updating is just rerendering 
  update: function(e) {
    this.selectedTime = parseInt($(e.target).text());

    this.render();
  }
});


var partyCollection = new PartyCollection();
var partyView = new PartyView({
  el: $('.party_01'),
  collection: partyCollection
});
partyCollection.fetch({reset: true});
