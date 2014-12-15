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
  }
});

var GraphCollection = Backbone.Collection.extend({
  initialize: function(models, opt) {
    this.parentCollection = opt.parentCollection;

    this.parentCollection.on('reset add remove change', this.calculateGraph, this);
  },
  calculateGraph: function() {
    var time = this.parentCollection.getSelectedTime();

    var nodes = this.parentCollection.chain()
      .groupBy(function(model) {
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
          type: 'node',
          id: enter.get('partier'),
          name: enter.get('partier'),
          entered: enter.get('time') === time,
          exit: exit && (exit.get('time') - 100 === time)
        };
      }).value();

    var links = this.parentCollection.chain()
      .filter(function(model) {
        return model.get('action') === 'talk'
          && model.get('time') === time;
      }).map(function(talk) {
        return {
          type: 'link',
          source: _.find(nodes, function(node) {
            return node.name === talk.get('partier');
          }),
          target: _.find(nodes, function(node) {
            return node.name === talk.get('partier2');
          })
        }
      }).value();

    this.set(_.union(nodes, links));
  },
  getNodes: function() {
    return this.filter(function(model) {
      return model.get('type') === 'node'
    });
  },
  getLinks: function() {
    return this.filter(function(model) {
      return model.get('type') === 'links'
    });
  }
});

var AppView = Backbone.View.extend({
  initialize: function() {
    this.collection = this.options.collection;
    this.graphCollection = this.options.graphCollection;

    this.collection.on('reset add remove change', this.render, this);
    this.graphCollection.on('reset add', this.addToGraph, this);
    this.graphCollection.on('remove', this.removeFromGraph, this);

    this.graphVisualization = GraphVisualization()
      .width(300).height(300);
    d3.select(this.$('.graph')[0])
      .call(this.graphVisualization);
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
  addToGraph: function(models) {
    models = _.isArray(models) ? models : [models];

    var that = this;
    _.each(models, function(model) {
      if (model.get('type') === 'node') {
        that.graphVisualization.addNode(model);
        model.on('change', function() {
          that.graphVisualization.updateNode(undefined, model);
        });
      }
      
    });

    this.update();
  },
  removeFromGraph: function(models) {
    models = _.isArray(models) ? models : [models];

    var that = this;
    _.each(models, function(model) {
      if (model.get('type') === 'node') {
        that.graphVisualization.removeNode(model);
      }
      
      model.off('change');
    });

    this.update();
  },
  update: function() {
    var nodes = this.graphCollection.getNodes(),
      links = this.graphCollection.getLinks();

    this.graphVisualization.update(nodes, links);
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
    data = {nodes: [], links: []},
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

  Graph.update = function(nodes, links) {
    force.nodes(nodes).links(links);
    force.start();
  }

  Graph.addNode = function(model) {
    node = container.append('g')
      .datum(model)
      .classed('node', true)
      .call(force.drag());

    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em');

    node.insert('rect', 'text')
      .attr('height', 20)
      .attr('y', -10)
      .attr('rx', 3).attr('ry', 3)
      .attr('stroke-width', 2);

    node.call(Graph.updateNode);

  }

  Graph.updateNode = function(node, model) {
    if (!node) {
      node = container.selectAll('.node')
        .filter(function(data) {
          return model === data;
        });
    }

    node.select('text')
      .attr('fill', function(model) {
        return (model.get('entered') || model.get('exit')) 
          ? '#fff' : '#ccc';
      })
      .text(function(model) {
        return model.get('name');
      }).each(function(model) {
        model.set('width', this.getBBox().width + 15);
      });

    node.select('rect')
        .attr('width', function(model) {
          return model.get('width');
        }).attr('x', function(model) {
          return -model.get('width') / 2
        }).attr('fill', function(model) {
          return model.get('entered') ? '#337ab7' :
            (model.get('exit') ? '#f0ad4e' : '#fff');
        }).attr('stroke', function(model) {
          return model.get('entered') ? '#2e6da4' : 
            (model.get('exit') ? '#eea236' : '#ccc');
        }).attr('stroke-width', 2);
  }

  Graph.removeNode = function(model) {
    container.selectAll('.node')
        .filter(function(data) {
          return model === data;
        }).remove();
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
    container.selectAll('.node')
      .attr('transform', function(model) {
        model.set('x', model.x, {silent: true});
        model.set('y', model.y, {silent: true});

        return 'translate(' + model.get('x') + ',' + model.get('y') + ')';
      });
    container.selectAll('.link')
      .attr('x1', function(model) {
        return model.get('source').get('x');
      }).attr('y1', function(d) {
        return model.get('source').get('y');
      }).attr('x2', function(d) {
        return model.get('target').get('x');
      }).attr('y2', function(d) {
        return model.get('target').get('y');
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
var graphCollection = new GraphCollection([], {
  parentCollection: partyCollection
});
var appView = new AppView({
  el: $('.party_5'),
  collection: partyCollection,
  graphCollection: graphCollection
});
partyCollection.fetch();
