# To do
- admin: warn in case of items with same name
- frontend search supporting masks
- plugin: list of IPs seen
- admin/fs: check if source exists when set
- plugins: after installing, switch to installed (and perhaps highlight new one)
- plugins' log, accessible in admin
- admin: check + update
- frontend: hide closer button on login dialog accessing a protected resource, as it's no use
- generation of links to give access to a file
  - an admin page where you can pick a file or folder(zip), and a link is generated
  - limits: expiration, number of downloads 
  - description, creation, delete
- easier nat life
  - show public ip use, https://github.com/sindresorhus/public-ip
  - configure router with upnp. If it fails, suggest a guide. https://github.com/indutny/node-nat-upnp
  - offer ddns registration/update
- admin/fs: sort items
- rename file (with delete permission)
- admin/config: hide advanced settings
- admin/fs: support insert/delete key
- admin/monitor: show some info on what folder is browsing
- admin/fs: navigate file picker with keyboard
- move files #203
- admin: in a group, show linked accounts
- command line help --help
- plugin download-counter: expose results on admin
- plugin to show country by ip in admin/monitor
- log filter plugin
- admin: improve masks editor
- admin: warn before changing page if we have unsaved changes
- plugin: comments
- plugin: upload quota per-account (possibly inheriting), and a default
- plugin: make letsencrypt easier
  - could be just automatic detection of files by certbot
  - letsencrypt supports plugins to automatically configure webservers
- updater (stop,unzip,start)
- node.comment
- config: max connections/downloads (total/per-ip)
- thumbnails support
- webdav?
- log: ip2name
- apis in separated log file with parameters?
- search operators (size, type?)
- ability to install as service in Windows
    - an application to control the service as tray icon
