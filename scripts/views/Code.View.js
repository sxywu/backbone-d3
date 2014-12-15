define([
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
  return Backbone.View.extend({
    initialize: function() {
      this.key = this.options.key;
      this.lines = this.options.lines;
      this.sections = this.options.sections;
      this.highlights = this.options.highlights;
      this.toggleHighlight = false;
    },
    render: function() {
      var template = _.template(CodeTemplate, {
        key: this.key,
        sections: this.sections, 
        lines: this.lines,
        highlights: this.highlights,
        toggleHighlight: this.toggleHighlight
      });

      this.$('.codeSample').html(template);

      Prism.highlightAll();

      return this;
    },
    events: {
      "click .conciseMode": "toggleMode"
    },
    toggleMode: function() {
      this.toggleHighlight = !this.toggleHighlight;

      this.$('.conciseMode').toggleClass('btn-default');
      this.$('.conciseMode').toggleClass('btn-primary');

      this.render();
    }
  });
})