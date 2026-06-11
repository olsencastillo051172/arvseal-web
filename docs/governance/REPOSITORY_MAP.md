# Mapa de Topología de Repositorios

El ecosistema se divide estrictamente para proteger la instrumentación comercial.

### Repositorios Públicos (Pendientes de Go-Live)
* `arv-spec/`: Estándares de datos, esquemas JSON y test vectors.
* `arv-proof/`: CLI y kernel criptográfico ejecutable (LOCAL_L0).
* `arv-sdk/`: Wrappers de integración.

### Repositorios Privados (Estrictamente Aislados)
* `arv-core-private/`: Contiene el Policy Engine, Dispute Logic, y la generación de Evidence Certificates.
* `arv-vault/`: Lógica de instrumentación comercial y métricas (Baúl de pruebas).
* `arv-gateway/`: Conectores a bases de datos de producción y orquestación.
* `arv-web/`: Frontend y experiencia de usuario del portal oficial.
