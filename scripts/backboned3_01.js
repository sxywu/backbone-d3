var PartyCollection = Backbone.Collection.extend({
  fetch: function() {
    var response = localStorage['party'];
    response = (response ? $.parseJSON(response) : []);
    this.reset(response);
  },
  save: function() {
    localStorage['party'] = JSON.stringify(this.toJSON());
  },
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

var AppView = Backbone.View.extend({
  initialize: function() {
    this.collection = this.options.collection;
    this.selectedTime;

    this.collection.on('reset add remove', _.bind(this.render, this));
  },
  render: function() {
    var times = this.collection.getAllTimes();
    this.selectedTime = this.selectedTime || times[0];

    this.$('.results').html(this.renderTime(times));
  },
  renderTime: function(times) {
    var $times = $('<div class="times"></div>'),
      that = this;
    _.each(times, function(time) {
      $times.append('<span class="btn '
        + (that.selectedTime === time ? 'btn-primary' : 'btn-default')
        + ' btn-xs partyTime">' 
        + time
      + '</span>');
    });
    return $times;
  },
  events: {
    "click .submitParty": "submitParty",
    "change .selectAction": "actionChanged"
  },
  submitParty: function() {
    var party = {};

    party.time = parseInt(this.$('.selectTime').val());
    party.partier = this.$('.inputPartier').val();
    party.action = this.$('.selectAction').val();

    // validation for partier being non-empty
    // validation for talk not being allowed if user hasn't entered
    // or has already exited
    // not allowed to exit unless user has already entered
    if (party.action === 'talk') {
      party.partier2 = this.$('.inputPartier2').val();
    }
    
    this.collection.add(party);
  },
  actionChanged: function() {
    var action = this.$('.selectAction').val();
    if (action === 'talk') {
      this.$('.inputPartier2').removeClass('hidden');
    } else {
      this.$('.inputPartier2').addClass('hidden');
    }
  },
  updateTime: function(e) {
  }
});

var GraphView = Backbone.View.extend({
  
});

var partyCollection = new PartyCollection();
var appView = new AppView({
  el: $('.party'),
  collection: partyCollection
});
partyCollection.fetch();
