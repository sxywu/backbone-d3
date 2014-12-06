var PartyCollection = Backbone.Collection.extend({
  fetch: function() {
    var response = localStorage['party'];
    response = (response ? $.parseJSON(response) : []);
    this.reset(response);
  },
  save: function() {
    localStorage['party'] = JSON.stringify(this.toJSON());
  },
  getSelectedTime: function() {
    return this.selectedTime || this.getAllTimes()[0] || 1800;
  },
  setSelectedTime: function(time) {
    this.selectedTime = time;
  },
  getAllTimes: function() {
    return this.chain().pluck('attributes')
      .pluck('time').uniq().value();
  },
  getGraphAtTime: function(time) {
    var nodes = this.chain().groupBy(function(model) {
        return model.get('partier')
      }).filter(function(actions) {
        var enter = _.find(actions, function(action) {
            return action.get('action') === 'enter';
          }),
          exit = _.find(actions, function(action) {
            return action.get('action') === 'exit';
          });
        return enter.get('time') <= time
          && (exit ? time < exit.get('time') : true);
      }).map(function(actions) {
        var enter = _.find(actions, function(action) {
            return action.get('action') === 'enter';
          }),
          exit = _.find(actions, function(action) {
            return action.get('action') === 'exit';
          });
        return {
          name: enter.get('partier'),
          entered: enter.get('time') === time,
          exit: exit && (exit.get('time') - 100 === time)
        };
      }).value();

    var links = this.chain().filter(function(model) {
        return model.get('action') === 'talk';
      }).map(function(talk) {
        return {
          source: _.find(nodes, function(node) {
            return node.name === talk.get('partier');
          }),
          target: _.find(nodes, function(node) {
            return node.name === talk.get('partier2');
          })
        }
      }).value();

      return {nodes: nodes, links: links};
  }
});

var AppView = Backbone.View.extend({
  initialize: function() {
    this.collection = this.options.collection;
    this.graphView = new GraphView({
      el: this.$('.graph'),
      collection: this.collection
    });
    this.timeView = new TimeView({
      el: this.$('.times'),
      collection: this.collection
    })
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
  }
});

var TimeView = Backbone.View.extend({
  initialize: function() {
    this.collection = this.options.collection;
    this.selectedTime;

    this.collection.on('reset add remove', _.bind(this.render, this));
  },
  render: function() {
    var times = this.collection.getAllTimes();
    this.$el.empty();
    this.renderTime(times);
  },
  renderTime: function(times) {
    var that = this, 
      selectedTime = this.collection.getSelectedTime();
    _.each(times, function(time) {
      that.$el.append('<span class="btn '
        + (selectedTime === time ? 'btn-primary' : 'btn-default')
        + ' btn-xs partyTime">' 
        + time
      + '</span>');
    });
  },
  updateTime: function(e) {
  }
});

var GraphView = Backbone.View.extend({
  initialize: function() {
    this.collection = this.options.collection;
    this.collection.on('reset add remove', _.bind(this.render, this));

    this.d3 = d3.select(this.el);
    this.force = d3.layout.force()
      .size([250, 250])
      .charge(-300)
      .linkDistance(100)
      .on('tick', _.bind(this.onTick, this));
  },
  render: function() {
    var selectedTime = this.collection.getSelectedTime(),
      graph = this.collection.getGraphAtTime(selectedTime);

    this.renderNodes(graph.nodes);
    this.renderLinks(graph.links);
    this.updateForce(graph.nodes, graph.links);
  },
  renderNodes: function(nodes) {
    this.node = this.d3.selectAll('.node')
      .data(nodes, function(d) {
        return d.name;
      });

    this.node.enter().append('g')
      .classed('node', true);
    this.node.exit().remove();

    this.node.append('circle')
        .attr('r', 10)
        .attr('fill', function(d) {
          console.log(d)
          return d.entered ? '#337ab7' :
            (d.exit ? '#f0ad4e' : '#fff');
        }).attr('stroke', function(d) {
          return d.entered ? '#2e6da4' : 
            (d.exit ? '#eea236' : '#ccc');
        }).attr('stroke-width', 2);

    this.node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('fill', function(d) {
        return (d.entered || d.exit) ? '#fff' : '#ccc';
      })
      .text(function(d) {
        return d.name[0];
      });
  },
  renderLinks: function(links) {
    this.link = this.d3.selectAll('.link')
      .data(links, function(d) {
        return d.source.name + ',' + d.target.name;
      });

    this.link.enter().insert('line', '.node')
      .classed('link', true);
    this.link.exit().remove();

    this.link.attr('stroke', '#ccc')
      .attr('stroke-width', 2);
  },
  updateForce: function(nodes, links) {
    this.force.nodes(nodes)
      .links(links);

    this.force.start();
  },
  onTick: function() {
    this.node.attr('transform', function(d) {
      return 'translate(' + d.x + ',' + d.y + ')';
    });
    this.link.attr('x1', function(d) {
      return d.source.x;
    }).attr('y1', function(d) {
      return d.source.y;
    }).attr('x2', function(d) {
      return d.target.x;
    }).attr('y2', function(d) {
      return d.target.y;
    });
  }
});

var partyCollection = new PartyCollection();
var appView = new AppView({
  el: $('.party'),
  collection: partyCollection
});
partyCollection.fetch();
