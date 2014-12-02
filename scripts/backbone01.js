/*
simple visualization of partygoers at 6pm, 9pm, 12pm
written only with Backbone
*/

var party = [
	{
		time: 1800,
		partiers: ['Shirley', 'Clarisse', 'Katherine']
	},
	{
		time: 2100,
		partiers: ['Shirley', 'Alex', 'Clarisse', 'Allison', 'Mike', 'Adam', 'Patrick', 'Katherine', 'Diane']
	},
	{
		time: 2400,
		partiers: ['Clarisse', 'Mike', 'Adam', 'Katherine', 'Zack']
	}
];

// first, "fetch" the data into a collection
var partyCollection = new Backbone.Collection();
partyCollection.reset(party);

var PartyView = Backbone.View.extend({
	initialize: function() {
		this.collection = this.options.collection;
		this.index = 0;

		this.collection.on('reset', _.bind(this.render, this));
	},
	// then render two parts:
	// 1. the time
	// 2. the partiers at that time
	render: function() {
		var model = this.collection.at(this.index);
		this.$el.html(this.renderTime(model));
		this.$el.append(this.renderPartiers(model));

		return this;
	},
	renderTime: function(model) {
		return $('<span class="btn btn-default btn-xs partyTime">' 
			+ model.get('time') 
			+ '</span>');
	},
	renderPartiers: function(model) {
		var $partiers = $('<span class="partiers"></span>');
		_.each(model.get('partiers'), function(partier) {
			$partiers.append('<span class="label label-primary partier">'
				+ partier + '</span>');
		});
		return $partiers;
	},
	events: {
		'click .partyTime': 'update'
	},
	// updating is just rerendering
	update: function() {
		this.index = (this.index + 1) % 3;

		this.render();
	}
});

var partyView = new PartyView({
	collection: partyCollection
});
$('.party').append(partyView.render().el);

