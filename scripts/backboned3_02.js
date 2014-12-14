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
    this.trigger('change');
  },
  getAllTimes: function() {
    return _.chain(_.range(18, 25))
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

    this.graphVisualization = GraphVisualization()
      .width(300).height(300);
    d3.select(this.$('.graph')[0])
      .call(this.graphVisualization);

    this.collection.on('reset add remove change', _.bind(this.update, this));
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
  update: function() {
    var graphData = this.collection.getGraphAtTime(selectedTime);

    this.graphVisualization
      .data(graphData)
      .update();

    this.renderTime();
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

var GraphVisualization = function() {

  var container, node, link, // all d3 selections
    data = {nodes: [], links: []}, // an object with nodes and links data for the graph
    force = d3.layout.force(),
    width = 300, height = 300,
    charge = -300, linkDistance = 100;

  var Graph = function(selection) {
    container = selection;

    force.size([width, height])
      .charge(charge)
      .linkDistance(linkDistance)
      .on('tick', tick);

    return Graph;
  }

  Graph.update = function() {
    persistPositions();

    updateNode();
    updateLink();

    force.nodes(data.nodes).links(data.links);
    force.start();
  }

  var updateNode = function() {
    node = container.selectAll('.node')
      .data(data.nodes, function(d) {
        return d.name;
      });

    node.enter().append('g')
      .classed('node', true)
      .call(force.drag());

    node.exit().remove();

    node.append('text')
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

    node.insert('rect', 'text')
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
  }

  var updateLink = function() {
    link = container.selectAll('.link')
      .data(data.links, function(d) {
        return d.source.name + ',' + d.target.name;
      });

    link.enter().insert('line', '.node')
      .classed('link', true);
    link.exit().remove();

    link.attr('stroke', '#ccc')
      .attr('stroke-width', 2);
  }

  var tick = function() {
    node.attr('transform', function(d) {
      return 'translate(' + d.x + ',' + d.y + ')';
    });
    link.attr('x1', function(d) {
      return d.source.x;
    }).attr('y1', function(d) {
      return d.source.y;
    }).attr('x2', function(d) {
      return d.target.x;
    }).attr('y2', function(d) {
      return d.target.y;
    });
  }

  persistPositions = function() {
    if (!node) return;

    node.each(function(d) {
      var n = _.find(data.nodes, function(node) {
        return node.name === d.name;
      })
      if (n) {
        n.x = d.x;
        n.y = d.y;
      }
    });
  }

  Graph.width = function(val) {
    if (!val) return width;
    width = val;
    return Graph; // for chaining purposes
  }

  Graph.height = function(val) {
    if (!val) return height;
    height = val;
    return Graph; // for chaining purposes
  }

  Graph.data = function(val) {
    if (!val) return data;
    data = val;
    return Graph; // for chaining purposes
  }

  return Graph;
}

var partyCollection = new PartyCollection();
var appView = new AppView({
  el: $('.party_4'),
  collection: partyCollection
});
partyCollection.fetch();
