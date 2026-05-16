// CloudFront Function (viewer-request) — maps clean URLs to the objects
// produced by `next build` with output:'export' and trailingSlash:true.
//   /pricing       -> /pricing/index.html
//   /pricing/      -> /pricing/index.html
//   /assets/x.css  -> unchanged (has a file extension)
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (uri.includes('.')) {
    return request;
  }
  if (uri.endsWith('/')) {
    request.uri = uri + 'index.html';
  } else {
    request.uri = uri + '/index.html';
  }
  return request;
}
