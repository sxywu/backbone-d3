var PartyCollection = Backbone.Collection.extend({
  fetch: function() {
    var response = localStorage['party'];
    response = (response ? $.parseJSON(response) : []);
    this.reset(response);
  },
  save: function() {
    localStorage['party'] = JSON.stringify(this.toJSON());
  },
  clear: function() {
    delete localStorage['party'];
    this.reset();
  },
  getSelectedTime: function() {
    return this.selectedTime || this.getAllTimes()[0] || 1800;
  },
  setSelectedTime: function(time) {
    this.selectedTime = time;
  },
  getAllTimes: function() {
    return _.chain(_.range(18, 24))
      .map(function(hour) {
        return hour * 100;
      }).value();
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
        return model.get('action') === 'talk'
          && model.get('time') === time;
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
  },
  render: function() {
    this.renderTime();
  },
  renderTime: function() {
    this.$('.times').empty();

    var that = this, 
      times = this.collection.getAllTimes(),
      selectedTime = this.collection.getSelectedTime();
    _.each(times, function(time) {
      that.$('.times').append('<span class="btn '
        + (selectedTime === time ? 'btn-primary' : 'btn-default')
        + ' btn-xs partyTime">' 
        + time
      + '</span>');
    });
  },
  events: {
    "click .submitParty": "submitParty",
    "click .clearParty": "clearParty",
    "change .selectAction": "actionChanged",
    'click .partyTime': 'updateTime'
  },
  submitParty: function() {
    var party = {};

    party.time = parseInt(this.$('.selectTime').val());
    party.partier = this.$('.inputPartier').val();
    party.action = this.$('.selectAction').val();

    if (party.action === 'talk') {
      party.partier2 = this.$('.inputPartier2').val();
    }
    
    this.collection.add(party);
    this.collection.save();
  },
  clearParty: function() {
    this.collection.clear();
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
    var selectedTime = parseInt($(e.target).text());
    this.collection.setSelectedTime(selectedTime);
    this.renderTime();
  }
});

var GraphView = Backbone.View.extend({
  initialize: function() {
    this.collection = this.options.collection;

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

    this.persistPositions(graph.nodes);
    this.renderNodes(graph.nodes);
    this.renderLinks(graph.links);
    this.updateForce(graph.nodes, graph.links);
  },
  persistPositions: function(nodes) {
    if (!this.node) return;

    this.node.each(function(d) {
      var node = _.find(nodes, function(node) {
        return node.name === d.name;
      })
      if (node) {
        node.x = d.x;
        node.y = d.y;
      }
    });
  },
  renderNodes: function(nodes) {
    this.node = this.d3.selectAll('.node')
      .data(nodes, function(d) {
        return d.name;
      });

    this.node.enter().append('g')
      .classed('node', true)
      .call(this.force.drag());
    this.node.exit().remove();

    this.node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('fill', function(d) {
        return (d.entered || d.exit) ? '#fff' : '#ccc';
      })
      .text(function(d) {
        return d.name;
      }).each(function(d) {
        d.width = this.getBBox().width + 15;
      });

    this.node.insert('rect', 'text')
        .attr('width', function(d) {
          return d.width
        }).attr('height', 20)
        .attr('x', function(d) {
          return -d.width / 2
        })
        .attr('y', -10)
        .attr('rx', 3).attr('ry', 3)
        .attr('fill', function(d) {
          return d.entered ? '#337ab7' :
            (d.exit ? '#f0ad4e' : '#fff');
        }).attr('stroke', function(d) {
          return d.entered ? '#2e6da4' : 
            (d.exit ? '#eea236' : '#ccc');
        }).attr('stroke-width', 2);
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
  el: $('.party_03'),
  collection: partyCollection
});
partyCollection.fetch();
