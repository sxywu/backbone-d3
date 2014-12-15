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
    "app/views/Code.View"
], function(
    $,
    _,
    Backbone,
    CodeView
) {
    app = {};

    $.get('scripts/sections.json', function(allSections) {
        $.get('scripts/highlights.json', function(highlights) {
            _.each(allSections, function(sections, key) {
              $.get('scripts/' + key + '.js', function(file) {
                var lines = file.split(/\n/);
                var codeView = new CodeView({
                    key: key,
                    el: $('.' + key),
                    lines: lines,
                    sections: sections,
                    highlights: highlights[key]
                });

                codeView.render();
              });
            });
        });
    });

    $.get('data/party.json', function(data) {
      data = JSON.stringify(data).replace(/\}\,/g, '\,\n');
      $('.partyData').text(data);

      Prism.highlightAll();      
    });
});