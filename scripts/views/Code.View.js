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
      this.lines = this.options.lines;
      this.sections = this.options.sections;
      this.highlights = this.options.highlights;
    },
    render: function() {
      var template = _.template(CodeTemplate, {
        sections: this.sections, 
        lines: this.lines,
        highlights: this.highlights,
        toggleHighlight: true
      });

      this.$el.html(template);

      Prism.highlightAll();

      return this;
    }
  });
})