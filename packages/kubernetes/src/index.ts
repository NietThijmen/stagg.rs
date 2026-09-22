import * as k8s from '@kubernetes/client-node';

export interface KubernetesClientConfig {
  kubeconfig?: string;
}

export function createKubernetesClient(config: KubernetesClientConfig = {}) {
  const kc = new k8s.KubeConfig();

  if (config.kubeconfig) {
    kc.loadFromFile(config.kubeconfig);
  } else {
    kc.loadFromDefault();
  }

  return {
    kc,
    apps: kc.makeApiClient(k8s.AppsV1Api),
    core: kc.makeApiClient(k8s.CoreV1Api),
    networking: kc.makeApiClient(k8s.NetworkingV1Api),
    autoscaling: kc.makeApiClient(k8s.AutoscalingV2Api),
    customObjects: kc.makeApiClient(k8s.CustomObjectsApi),
    gateway: kc.makeApiClient(k8s.NetworkingV1Api),
    objects: k8s.KubernetesObjectApi.makeApiClient(kc),
  };
}

export type KubernetesClient = ReturnType<typeof createKubernetesClient>;

export * from './manifests.js';
export * from './apply.js';
export * from './egress.js';
export * from '@kubernetes/client-node';
