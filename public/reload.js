const source = new EventSource("/__reload");
source.onmessage = () => window.location.reload();
