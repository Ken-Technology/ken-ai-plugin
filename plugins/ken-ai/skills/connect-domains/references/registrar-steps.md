# Changing nameservers at a registrar

Connecting a domain you own means changing its nameservers at the registrar where it is registered. Nothing is transferred: the domain, its renewal and its billing stay at the registrar. Use the key from the preview row's `registrar.guide` to pick the section. Menu names move around; look for the words "nameservers" or "DNS servers" on the domain's page.

Every registrar follows the same pattern:

1. Sign in at the registrar and open the domain.
2. Find its nameservers and choose custom (your own) nameservers.
3. Replace every nameserver with the pair from the import, exactly as shown, and delete any extra ones.
4. Save. DNS can take minutes to hours to update. Then check the nameservers.

The nameservers are per domain. Copy them from the import result, never from memory or from another domain.

## godaddy

My Products, then the domain's DNS button, then Nameservers and Change Nameservers. Choose "I'll use my own nameservers", paste the pair, Save.

## namecheap

Domain List, Manage next to the domain, the Nameservers dropdown set to Custom DNS, paste the pair, and click the green check to save.

## porkbun

Domain Management, the domain's Details, Authoritative Nameservers (edit), replace them with the pair, Submit.

## squarespace

Domains, the domain, DNS, Domain Nameservers, then use custom nameservers and paste the pair.

## google

Google Domains moved to Squarespace. Sign in to Squarespace Domains with the same Google account, open the domain, DNS, Domain Nameservers, use custom nameservers.

## ionos

Domains and SSL, the domain, the DNS tab (or the three-dot menu), Nameservers, use custom nameservers, paste the pair.

## ovh

Web Cloud, Domain names, the domain, the DNS servers tab, Modify DNS servers, paste the pair.

## gandi

Domain, the Nameservers tab, Change, External nameservers, paste the pair.

## hover

The domain, the Nameservers section (under the DNS tab), Edit, paste the pair.

## namecom

My Domains, the domain, Nameservers, Manage, paste the pair.

## dynadot

My Domains, Manage Domains, the domain, Name Servers, use Dynadot's custom option and paste the pair.

## enom

Domains, My Domains, the domain, DNS Server Settings, custom, paste the pair.

## networksolutions

Account Manager, My Domain Names, Manage, Change Where Domain Points, Domain Name Server, paste the pair.

## cloudflare

Cloudflare Registrar cannot change a domain's nameservers: a domain registered there must keep Cloudflare's. It cannot be connected. Do not suggest a transfer out. Recommend buying a new domain through the skill instead (`domain-selection`).

## other

The registrar is not one of the above, or the lookup failed. Ask the user which registrar the domain is with, and give the pattern above. If the registrar offers no custom nameservers, the domain cannot be connected: recommend buying a new domain through the skill (`domain-selection`).
