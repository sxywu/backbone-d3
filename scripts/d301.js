// fetch data
d3.json('data/party.json', function(response) {
	var getAllTimes = function(actions) {
			return _.chain(actions).pluck('time').uniq().value();
		},
		getPartiersAtTime = function(actions, time) {
			return _.chain(actions).groupBy(function(action) {
				return action.partier;
			}).filter(function(actions) {
				return actions[0].time <= time
					&& (actions[1] ? time < actions[1].time : true);
			}).map(function(actions) {
				return {
					name: actions[0].partier,
					entered: actions[0].time === time,
					exit: actions[1] && (actions[1].time - 100 === time)
				};
			}).value();
		}

	var allTimes = getAllTimes(response),
		selectedTime = allTimes[0],
		partiersAtTime = getPartiersAtTime(response, selectedTime);

	var container = d3.select('.party');

	// first render the times
	var times = container.append('div')
		.classed('times', true)
		.selectAll('.partyTime')
		.data(getAllTimes(response));
		
	times.enter().append('span')
			.classed({
				'partyTime': true,
				'btn': true,
				'btn-xs': true,
				'btn-default': function(time) {
					return time !== selectedTime;
				},
				'btn-primary': function(time) {
					return time === selectedTime;
				}
			}).text(function(time) {
				return time;
			});

	// then render the partiers
	var partiers = container.append('div')
		.classed('partiers', true)
		.selectAll('.partier')
		.data(partiersAtTime, function(partier) {
			return partier.name;
		});

	partiers.enter().append('span')
			.classed({
				'partier': true,
				'label': true,
				'label-default': function(partier) {
					return !partier.entered && !partier.exit;
				},
				'label-primary': function(partier) {
					return partier.entered;
				},
				'label-warning': function(partier) {
					return partier.exit;
				}
			}).text(function(partier) {
				return partier.name;
			});

	times.on('click', function() {
		selectedTime = d3.select(d3.event.target).datum();
		partiersAtTime = getPartiersAtTime(response, selectedTime);

		times.classed({
			'btn-default': function(time) {
					return time !== selectedTime;
			},
			'btn-primary': function(time) {
				return time === selectedTime;
			}
		})

		// rebind the updated partier data
		partiers = partiers.data(partiersAtTime, function(partier) {
				return partier.name;
			})

		partiers.enter().append('span');

		partiers.exit().remove();

		// update
		partiers.classed({
				'partier': true,
				'label': true,
				'label-default': function(partier) {
					return !partier.entered && !partier.exit;
				},
				'label-primary': function(partier) {
					return partier.entered;
				},
				'label-warning': function(partier) {
					return partier.exit;
				}
			}).text(function(partier) {
				return partier.name;
			});
	})
});