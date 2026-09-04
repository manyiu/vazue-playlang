# Shared by scripts/sync-playlang-csp.sh and scripts/test-sync-playlang-csp.sh.
# Expects --arg csp and --arg corp.
def incomplete_xss:
  . != null and ((.Override | type) != "boolean" or (.Protection | type) != "boolean");
def incomplete_frame:
  . != null and ((.Override | type) != "boolean" or (.FrameOption | type) != "string");

.SecurityHeadersConfig.ContentSecurityPolicy.ContentSecurityPolicy = $csp
| if (.SecurityHeadersConfig.XSSProtection | incomplete_xss) then
    del(.SecurityHeadersConfig.XSSProtection)
  else . end
| if (.SecurityHeadersConfig.FrameOptions | incomplete_frame) then
    del(.SecurityHeadersConfig.FrameOptions)
  else . end
| .CustomHeadersConfig.Items = (
    ((.CustomHeadersConfig.Items // [])
      | map(select(.Header != "Cross-Origin-Resource-Policy")))
    + [{
        Header: "Cross-Origin-Resource-Policy",
        Value: $corp,
        Override: true
      }]
  )
| .CustomHeadersConfig.Quantity = (.CustomHeadersConfig.Items | length)
