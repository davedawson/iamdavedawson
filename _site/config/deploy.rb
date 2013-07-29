# require 'mt-capistrano'

set :site,         "s102864"
set :application,  "iamdavedawson"
set :webpath,      "iamdavedawson.com"
set :domain,       "iamdavedawson.com"
set :user,         "dave%iamdavedawson.com"
set :password,     "d9d14d88"
set :scm, :git
set :repository,  "git@github.com:davedawson/iamdavedawson.git"

ssh_options[:username] = 'iamdavedawson.com@s102864.gridserver.com'

# set :deploy_to,  "/home/#{site}/domains/{domain}/html"

set :checkout, "export"

role :web, "#{domain}"
role :app, "#{domain}"
role :db,  "#{domain}", :primary => true

#task :after_update_code, :roles => :app do
#  put(File.read('config/database.yml'), "#{release_path}/config/database.yml", :mode => 0444)
#end

#task :restart, :roles => :app do
#  run "mtr restart #{application} -u #{user} -p #{password}"
#  run "mtr generate_htaccess #{application} -u #{user} -p #{password}"
#  migrate
#end