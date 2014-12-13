require.config({
    baseUrl: "scripts/contrib/",
    paths: {
        "app": "..",
        "underscore": "underscore",
        "backbone": "backbone",
        "bootstrap": "bootstrap",
        "d3": "d3.v3"
    },
    shim: {
        "underscore": {
            exports: "_"
        },
        "backbone": {
            deps: ["underscore", "jquery"],
            exports: "Backbone"
        },
        "bootstrap": {
            deps: ["jquery"]
        },
        "d3": {
            exports: "d3"
        }
    }
});

require([
    "jquery",
    "underscore",
    "backbone",
    "text!app/templates/Code.Template.html"
], function(
    $,
    _,
    Backbone,
    CodeTemplate
) {
    app = {};

    $.get('scripts/sections.json', function(allSections) {
        _.each(allSections, function(sections, key) {
          $.get('scripts/' + key + '.js', function(file) {
            var lines = file.split(/\n/);

            var template = _.template(CodeTemplate, {
              sections: sections, 
              lines: lines
            });

            $('.' + key).append(template);

            Prism.highlightAll();
          });
        });
    });

    $.get('data/party.json', function(data) {
      data = JSON.stringify(data).replace(/\}\,/g, '\,\n');
      $('.partyData').text(data);

      Prism.highlightAll();      
    });
});