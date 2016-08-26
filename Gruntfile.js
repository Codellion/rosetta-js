module.exports = function(grunt) {
  // hack to avoid loading a Gruntfile
  // You can skip this and just use a Gruntfile instead
  grunt.task.init = function() {};

  // Project configuration.
  // Combine all files in src/
  grunt.initConfig({
    concat: {
      dist: {
        src: [
              'src/dt-rosetta.js', 
              'src/dt-http.js', 
              'src/dt-router.js'
              ],
        dest: 'build/rosetta.js',
      },
    },
    uglify: {
      all_src : {
        options : {
          sourceMap : true,
          sourceMapName : 'sourceMap.map'
        },
        src : 'build/rosetta.js',
        dest : 'build/rosetta.min.js'
      }
    }
  });

  // Register your own tasks
  grunt.registerTask('default', function() {
    grunt.log.write('Ran my task.');
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');

  // Finally run the tasks, with options and a callback when we're done
  grunt.tasks(['default', 'concat', 'uglify'], {}, function() {
    grunt.log.ok('Done running tasks.');
  });

}
